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
