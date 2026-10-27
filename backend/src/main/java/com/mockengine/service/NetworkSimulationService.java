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
