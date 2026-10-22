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
