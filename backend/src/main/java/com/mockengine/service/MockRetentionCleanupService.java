package com.mockengine.service;

import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.jpa.MockEndpointRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MockRetentionCleanupService {

    private final MockEndpointRepository mockEndpointRepository;
    private static final Duration RETENTION_WINDOW = Duration.ofHours(24);

    /**
     * Tarea programada ejecutada cada hora en punto:
     * Expresión cron: segundo 0, minuto 0, cada hora (*), cualquier día.
     * Al terminar la purga de base de datos, se invalida la caché de Redis automáticamente.
     */
    @Scheduled(cron = "${app.retention.cron:0 0 * * * *}")
    @Transactional
    @CacheEvict(value = "activeMockEndpoints", allEntries = true)
    public int purgeExpiredEphemeralMockEndpoints() {
        LocalDateTime expirationThreshold = LocalDateTime.now().minus(RETENTION_WINDOW);
        log.info("Iniciando barrido de limpieza de mock endpoints efímeros anteriores a: {}", expirationThreshold);

        List<MockEndpoint> expiredEndpoints = mockEndpointRepository
                .findByEphemeralTrueAndCreatedAtBefore(expirationThreshold);

        if (expiredEndpoints.isEmpty()) {
            log.info("No se encontraron mock endpoints expirados para purgar");
            return 0;
        }

        int count = expiredEndpoints.size();
        mockEndpointRepository.deleteAllInBatch(expiredEndpoints);

        log.info("Purga completada con éxito: {} mock endpoints eliminados y caché de rutas invalidada", count);
        return count;
    }
}
