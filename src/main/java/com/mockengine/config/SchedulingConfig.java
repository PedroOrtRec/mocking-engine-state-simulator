package com.mockengine.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling // Habilita el soporte de tareas programadas (@Scheduled) en segundo plano
public class SchedulingConfig {
}
