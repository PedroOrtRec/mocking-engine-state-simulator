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
