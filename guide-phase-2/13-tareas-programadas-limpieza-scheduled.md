# Módulo 13: Tareas Programadas de Limpieza (`@Scheduled`)

En este módulo implementarás la automatización del ciclo de vida y la **política de retención de datos efímeros** requerida en las especificaciones del sistema:
> *"Hacer que la sesión custom o de invitado borre todos sus mock endpoints cada 24 horas."*

---

## 🎯 Objetivos de Aprendizaje

1. Dominar el subsistema de tareas programadas de Spring: `@EnableScheduling` y la anotación `@Scheduled`.
2. Comprender las diferencias fundamentales entre `fixedRate`, `fixedDelay` y expresiones **Cron UNIX**.
3. Diseñar transacciones de purga por lotes (*batch deletion*) eficientes en Spring Data JPA para no saturar el buffer de transacciones.
4. Coordinar la purga de base de datos con la invalidación de la caché de Redis (`@CacheEvict`).
5. Comprender los retos de concurrencia en arquitecturas con múltiples instancias (patrón *Distributed Lock* con ShedLock o Redis).

---

## 1. Fundamentos: Opciones de Programación en Spring

Spring proporciona tres formas principales de ejecutar métodos en segundo plano:

| Parámetro | Comportamiento | Caso de uso ideal |
| :--- | :--- | :--- |
| `fixedRate = 3600000` | Se ejecuta cada X ms contando desde el inicio de la tarea anterior. | Monitoreo continuo o métricas de salud. |
| `fixedDelay = 3600000` | Se ejecuta cada X ms contando desde que **finaliza** la ejecución anterior. | Procesos largos donde no se deben solapar ejecuciones. |
| `cron = "0 0 * * * *"` | Expresión de 6 campos (seg, min, hora, día del mes, mes, día de la semana). | Tareas fijadas a momentos exactos (ej: cada hora en punto o a medianoche). |

---

## 2. Habilitar la Programación en Spring Boot

En una clase de configuración o en la clase principal `@SpringBootApplication`:

```java
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
```

---

## 3. Servicio de Purga de Endpoints Efímeros (`MockRetentionCleanupService`)

Creamos el servicio en `com.mockengine.service`:

```java
package com.mockengine.service;

import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.MockEndpointRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
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
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    @CacheEvict(value = "activeMockEndpoints", allEntries = true)
    public void purgeExpiredEphemeralMockEndpoints() {
        Instant expirationThreshold = Instant.now().minus(RETENTION_WINDOW);
        log.info("Iniciando barrido de limpieza de mock endpoints efímeros anteriores a: {}", expirationThreshold);

        // Buscar endpoints marcados como efímeros cuya fecha de creación exceda las 24 horas
        List<MockEndpoint> expiredEndpoints = mockEndpointRepository
                .findByEphemeralTrueAndCreatedAtBefore(expirationThreshold);

        if (expiredEndpoints.isEmpty()) {
            log.info("No se encontraron mock endpoints expirados para purgar");
            return;
        }

        int count = expiredEndpoints.size();
        mockEndpointRepository.deleteAllInBatch(expiredEndpoints);

        log.info("Purga completada con éxito: {} mock endpoints eliminados y caché de rutas invalidada", count);
    }
}
```

### ¿Por qué `deleteAllInBatch` en lugar de `deleteAll`?
* `deleteAll()` ejecuta un bucle en memoria de sentencias `DELETE FROM mock_endpoints WHERE id = ?` para cada entidad, disparando triggers y validaciones entidad por entidad.
* `deleteAllInBatch()` genera una única sentencia SQL optimizada: `DELETE FROM mock_endpoints WHERE id IN (?, ?, ...)`, reduciendo drásticamente el tiempo de ejecución en base de datos.

---

## 4. Test Unitario y de Integración de la Tarea Programada

Para verificar la lógica de expiración sin tener que esperar 24 horas reales, testeamos inyectando fechas simuladas:

```java
@Test
void shouldPurgeEndpointsOlderThan24Hours() {
    // Given: Un mock efímero creado hace 25 horas
    MockEndpoint oldMock = MockEndpoint.builder()
            .name("Mock Temporal Expirado")
            .httpMethod("GET")
            .pathPattern("/api/temp")
            .ownerUsername("guest_123")
            .ephemeral(true)
            .createdAt(Instant.now().minus(Duration.ofHours(25)))
            .build();
    repository.save(oldMock);

    // Given: Un mock creado hace 2 horas (aún vigente)
    MockEndpoint recentMock = MockEndpoint.builder()
            .name("Mock Vigente")
            .httpMethod("GET")
            .pathPattern("/api/recent")
            .ownerUsername("guest_456")
            .ephemeral(true)
            .createdAt(Instant.now().minus(Duration.ofHours(2)))
            .build();
    repository.save(recentMock);

    // When: Ejecutamos el método de purga
    cleanupService.purgeExpiredEphemeralMockEndpoints();

    // Then: Solo el reciente sobrevive
    assertThat(repository.existsById(oldMock.getId())).isFalse();
    assertThat(repository.existsById(recentMock.getId())).isTrue();
}
```

---

## 5. Nota de Arquitectura para Producción: Múltiples Instancias

> [!WARNING]
> Si en el futuro despliegas varias réplicas del backend en Kubernetes o detras de un balanceador de carga, cada réplica intentará ejecutar la tarea `@Scheduled` a la misma hora, generando condiciones de carrera.
> En producción, este problema se resuelve utilizando **ShedLock** (`net.javacrumbs.shedlock:shedlock-spring`), una librería que usa una tabla en PostgreSQL o una clave en Redis para asegurar que **solo una instancia a la vez** ejecute el job programado.

¡Avanza al **[Módulo 13b: Gestión Avanzada de Estados de Escenario (1:N, Namespacing y Cuota Máxima)](./13b-gestion-estados-escenario-1-n.md)**!
