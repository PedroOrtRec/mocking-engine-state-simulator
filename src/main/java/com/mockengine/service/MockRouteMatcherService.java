package com.mockengine.service;

import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.jpa.MockEndpointRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.util.AntPathMatcher;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MockRouteMatcherService {

    private final MockEndpointRepository mockEndpointRepository;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Getter
    @Builder
    public static class MatchResult {
        private final MockEndpoint endpoint;
        private final Map<String, String> pathVariables;
    }

    /**
     * Cachea el listado completo de endpoints activos bajo la clave "all_active".
     */
    @Cacheable(value = "activeMockEndpoints", key = "'all_active'")
    public List<MockEndpoint> getActiveEndpoints() {
        log.debug("Cache MISS: Consultando mock endpoints activos en base de datos relacional");
        return mockEndpointRepository.findByActiveTrue();
    }

    /**
     * Resuelve qué endpoint de base de datos coincide con el método HTTP y la ruta recibida.
     */
    public Optional<MatchResult> findMatch(String httpMethod, String subpath) {
        log.debug("Buscando mock para método: {} y subpath: {}", httpMethod, subpath);

        // 1. Obtenemos todos los mocks activos desde caché Redis o PostgreSQL
        List<MockEndpoint> candidates = getActiveEndpoints()
                .stream()
                .filter(m -> m.getHttpMethod().equalsIgnoreCase(httpMethod))
                .toList();

        // 2. Comprobación rápida: coincidencia exacta
        for (MockEndpoint candidate : candidates) {
            if (candidate.getPathPattern().equals(subpath)) {
                return Optional.of(MatchResult.builder()
                        .endpoint(candidate)
                        .pathVariables(Collections.emptyMap())
                        .build());
            }
        }

        // 3. Comprobación por patrones con variables: ej /users/{id}
        for (MockEndpoint candidate : candidates) {
            String pattern = candidate.getPathPattern();
            if (pathMatcher.match(pattern, subpath)) {
                Map<String, String> uriVariables = pathMatcher.extractUriTemplateVariables(pattern, subpath);
                log.debug("Match encontrado con patrón '{}'. Variables: {}", pattern, uriVariables);
                return Optional.of(MatchResult.builder()
                        .endpoint(candidate)
                        .pathVariables(uriVariables)
                        .build());
            }
        }

        log.warn("No se encontró ningún mock activo para [{} {}]", httpMethod, subpath);
        return Optional.empty();
    }
}
