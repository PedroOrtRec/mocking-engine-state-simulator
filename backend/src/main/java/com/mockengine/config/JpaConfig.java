package com.mockengine.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(basePackages = "com.mockengine.repository.jpa")
@EntityScan(basePackages = "com.mockengine.entity")
public class JpaConfig {
}
