package com.mockengine;

import com.mockengine.dto.MockEndpointDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class MockEngineIntegrationIT {

    // Testcontainers levanta automáticamente una base de datos PostgreSQL real en Docker
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    @DisplayName("Flujo E2E: Registrar endpoint dinámico y consumirlo en /mock/**")
    void testRegisterAndCallMockEndpoint() {
        // 1. Registrar el mock mediante la API de administración
        MockEndpointDTO newMock = MockEndpointDTO.builder()
                .name("Consulta de saldo")
                .httpMethod("GET")
                .pathPattern("/api/wallet/balance")
                .statusCode(200)
                .responseBody("{\"balance\": 1500.50, \"currency\": \"EUR\"}")
                .delayMs(50L)
                .active(true)
                .build();

        ResponseEntity<String> createResponse = restTemplate.postForEntity(
                "/api/v1/admin/endpoints", newMock, String.class);
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // 2. Invocar el endpoint a través del Dynamic Dispatcher /mock/**
        ResponseEntity<String> mockResponse = restTemplate.getForEntity(
                "/mock/api/wallet/balance", String.class);

        assertThat(mockResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(mockResponse.getBody()).contains("1500.50");
        assertThat(mockResponse.getHeaders().get("X-Mock-Engine")).contains("true");
    }
}
