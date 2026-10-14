# Módulo 06: Latencia de Red, Concurrencia e Hilos Virtuales

En este módulo aprenderás cómo simular condiciones reales de conectividad móvil (3G/4G, retardos, caídas aleatorias, rate limits) y cómo gestionar la concurrencia en **Spring Boot 3 con Java 21** usando **Virtual Threads** y **CompletableFuture**.

---

## 1. El Problema de la Concurrencia y el Retardo Artificial

Para probar interfaces móviles y frontend (spinners de carga, skeleton screens, cancelaciones de peticiones al cambiar de pantalla, timeouts), necesitamos que el backend responda con retraso (ej: 1.500 ms).

### El modelo tradicional (Java 8 - 17: Platform Threads)
- Tomcat por defecto tiene un pool de **200 hilos del sistema operativo**.
- Cada hilo ocupa ~1 MB de memoria física.
- Si 200 clientes hacen peticiones con retardo simultáneamente y usas `Thread.sleep(1500)`, **los 200 hilos se bloquean**.
- El servidor colapsa y no puede responder a nadie más (**Thread Starvation**).

### La solución moderna en Java 21: Hilos Virtuales (Project Loom)
- Los **Virtual Threads** son gestionados por la JVM, no por el SO.
- Ocupan solo unos pocos bytes de memoria.
- Cuando un hilo virtual llama a `Thread.sleep()`, la JVM lo **desmonta** del hilo físico portador (Carrier Thread). El hilo físico queda libre inmediatamente para atender a otros clientes.
- Puedes tener **100.000 peticiones durmiendo simultáneamente** consumiendo un mínimo de CPU y RAM.

---

## 2. Activación de Virtual Threads en Spring Boot

Gracias a la configuración que pusimos en `application.yml`:

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

Spring Boot configura automáticamente:
1. El servidor Tomcat embebido para crear un hilo virtual por cada petición HTTP entrante.
2. Los ejecutores asíncronos (`@Async` y `TaskExecutor`) para usar Virtual Threads.

---

## 3. Perfiles de Red Móvil y Simulación de Latencia

Podemos modelar perfiles comunes de red móvil para que los desarrolladores puedan probar cómo responde su app:

```java
package com.mockengine.model;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum NetworkProfile {
    WIFI(5, 25),             // 5ms a 25ms
    FAST_4G(20, 80),         // 20ms a 80ms
    FAST_3G(150, 350),       // 150ms a 350ms
    SLOW_3G(400, 2000),      // 400ms a 2000ms
    EXTREME_JITTER(100, 3500); // Conexión inestable en tren/túnel

    private final long minDelayMs;
    private final long maxDelayMs;
}
```

---

## 4. Servicio de Simulación de Red y Caos: `NetworkSimulationService`

Crea el archivo `com.mockengine.service.NetworkSimulationService.java`:

```java
package com.mockengine.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.ThreadLocalRandom;

@Service
@Slf4j
public class NetworkSimulationService {

    /**
     * Aplica un retardo artificial no bloqueante (aprovechando Virtual Threads de Java 21).
     * Añade un pequeño 'jitter' aleatorio (variación de +-15%) para simular condiciones reales.
     */
    public void applyLatency(long configuredDelayMs) {
        if (configuredDelayMs <= 0) {
            return;
        }

        // Calculamos un jitter aleatorio del +-15%
        long jitter = (long) (configuredDelayMs * 0.15);
        long actualDelay = configuredDelayMs + ThreadLocalRandom.current().nextLong(-jitter, jitter + 1);
        actualDelay = Math.max(0, actualDelay);

        log.debug("Simulando latencia móvil: {} ms (hilo virtual: {})", 
                actualDelay, Thread.currentThread().isVirtual());

        try {
            // En un Virtual Thread de Java 21, sleep() es ultra-eficiente
            Thread.sleep(actualDelay);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("La simulación de latencia fue interrumpida");
        }
    }

    /**
     * Simulación de fallo aleatorio basado en el errorRate configurado (0.0 a 1.0).
     * Por ejemplo, un errorRate de 0.25 significa un 25% de probabilidad de error.
     */
    public boolean shouldSimulateFailure(double errorRate) {
        if (errorRate <= 0.0) {
            return false;
        }
        if (errorRate >= 1.0) {
            return true;
        }
        return ThreadLocalRandom.current().nextDouble() < errorRate;
    }
}
```

---

## 5. Simulación Asíncrona Alternativa con `CompletableFuture`

Aunque los hilos virtuales son la forma más idiomática en Spring Boot 3.3+, también es muy valioso aprender a manejar respuestas asíncronas reactivas usando **`CompletableFuture`** de Java y un `ScheduledExecutorService`:

```java
package com.mockengine.service;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.concurrent.*;

@Service
public class AsyncDelayService {

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);

    /**
     * Retorna un CompletableFuture que se completa una vez transcurrido el tiempo indicado.
     * Esto permite que Spring MVC maneje la petición de forma asíncrona sin retener ningún hilo.
     */
    public CompletableFuture<ResponseEntity<String>> delayedResponse(ResponseEntity<String> response, long delayMs) {
        CompletableFuture<ResponseEntity<String>> promise = new CompletableFuture<>();

        scheduler.schedule(() -> {
            promise.complete(response);
        }, delayMs, TimeUnit.MILLISECONDS);

        return promise;
    }
}
```

### ¿Cuándo usar cada enfoque?
- **Virtual Threads (`Thread.sleep`)**: Recomendado en Spring Boot 3.2+ con Java 21. Es código imperativo sencillo de leer y depurar con rendimiento masivo.
- **`CompletableFuture`**: Ideal si necesitas coordinar múltiples llamadas externas en paralelo (ej: consultar tres servicios simultáneamente y esperar al más rápido).

---

## 6. Simulación de Rate Limiting (HTTP 429 Too Many Requests)

Para que el equipo de frontend aprenda a gestionar límites de cuota (Rate Limiting), podemos simular un algoritmo de ventana deslizante o contador simple por sesión.

```java
package com.mockengine.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitingSimulatorService {

    // Guarda el recuento por cliente/sesión
    private final Map<String, ClientRateBucket> buckets = new ConcurrentHashMap<>();

    private static class ClientRateBucket {
        long windowStartEpochSecond;
        int requestCount;
    }

    /**
     * Permite máximo maxRequests por ventana de tiempo (ej: 10 peticiones cada 60 segundos).
     * Si supera el límite, devuelve true (debe emitirse HTTP 429).
     */
    public boolean isRateLimitExceeded(String sessionKey, int maxRequests, int windowSeconds) {
        long currentSecond = Instant.now().getEpochSecond();
        
        ClientRateBucket bucket = buckets.compute(sessionKey, (k, existing) -> {
            if (existing == null || (currentSecond - existing.windowStartEpochSecond) >= windowSeconds) {
                ClientRateBucket newBucket = new ClientRateBucket();
                newBucket.windowStartEpochSecond = currentSecond;
                newBucket.requestCount = 1;
                return newBucket;
            } else {
                existing.requestCount++;
                return existing;
            }
        });

        return bucket.requestCount > maxRequests;
    }
}
```

Siguiente paso: **[Módulo 07: Escenarios con Estado y Máquinas de Transición](./07-escenarios-con-estado.md)**.
