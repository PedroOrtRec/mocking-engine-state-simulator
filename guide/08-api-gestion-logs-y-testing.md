# Módulo 08: API de Gestión, Logs y Testing

En este módulo final implementarás la API REST administrativa para crear y gestionar mocks, el manejador global de errores con el estándar **RFC 7807 (ProblemDetail)** visto en `back_factinterna`, y la estrategia completa de **testing automatizado** (unitario e integración con **Testcontainers**).

---

## 1. La API Administrativa de Mocks

Crea el controlador `com.mockengine.controller.MockEndpointAdminController.java`:

```java
package com.mockengine.controller;

import com.mockengine.dto.MockEndpointDTO;
import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.MockEndpointRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/endpoints")
@RequiredArgsConstructor
@Slf4j
public class MockEndpointAdminController {

    private final MockEndpointRepository mockRepository;

    @GetMapping
    public ResponseEntity<List<MockEndpoint>> listAll() {
        return ResponseEntity.ok(mockRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MockEndpoint> getById(@PathVariable Long id) {
        MockEndpoint endpoint = mockRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mock no encontrado con ID: " + id));
        return ResponseEntity.ok(endpoint);
    }

    @PostMapping
    public ResponseEntity<MockEndpoint> create(@Valid @RequestBody MockEndpointDTO dto) {
        log.info("Creando nuevo mock endpoint: {} {}", dto.getHttpMethod(), dto.getPathPattern());

        MockEndpoint entity = MockEndpoint.builder()
                .name(dto.getName())
                .httpMethod(dto.getHttpMethod().toUpperCase())
                .pathPattern(dto.getPathPattern())
                .statusCode(dto.getStatusCode())
                .responseBody(dto.getResponseBody())
                .responseHeaders(dto.getResponseHeaders())
                .delayMs(dto.getDelayMs() != null ? dto.getDelayMs() : 0L)
                .errorRate(dto.getErrorRate() != null ? dto.getErrorRate() : 0.0)
                .failureStatusCode(dto.getFailureStatusCode() != null ? dto.getFailureStatusCode() : 500)
                .requestSchema(dto.getRequestSchema())
                .active(dto.getActive() != null ? dto.getActive() : true)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(mockRepository.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!mockRepository.existsById(id)) {
            throw new EntityNotFoundException("Mock no encontrado con ID: " + id);
        }
        mockRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

## 2. API de Inspección de Logs de Peticiones

Para que el equipo de frontend pueda ver en vivo qué peticiones llegaron al simulador:

Crea `com.mockengine.controller.AuditLogAdminController.java`:

```java
package com.mockengine.controller;

import com.mockengine.entity.RequestAuditLog;
import com.mockengine.repository.RequestAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/logs")
@RequiredArgsConstructor
public class AuditLogAdminController {

    private final RequestAuditLogRepository logRepository;

    @GetMapping
    public ResponseEntity<Page<RequestAuditLog>> getLogs(
            @RequestParam(required = false) String sessionKey,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageRequest pageRequest = PageRequest.of(page, size);
        if (sessionKey != null && !sessionKey.isBlank()) {
            return ResponseEntity.ok(logRepository.findBySessionKeyOrderByTimestampDesc(sessionKey, pageRequest));
        }
        return ResponseEntity.ok(logRepository.findAllByOrderByTimestampDesc(pageRequest));
    }
}
```

---

## 3. Manejador Global de Errores: Patrón `ProblemDetail`

Tal como vimos en [UserManagementExceptionHandler.java](file:///Users/pedroortega/dev/work/adquira/back_factinterna/src/main/java/com/adquira/facturacion/shared/exception/UserManagementExceptionHandler.java) de `back_factinterna`, implementaremos un `@RestControllerAdvice` que devuelva respuestas RFC 7807 legibles y estandarizadas:

Crea `com.mockengine.exception.GlobalExceptionHandler.java`:

```java
package com.mockengine.exception;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(EntityNotFoundException ex, HttpServletRequest request) {
        log.warn("Entidad no encontrada: {}", ex.getMessage());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource Not Found");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("error_code", "RESOURCE_NOT_FOUND");

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationErrors(MethodArgumentNotValidException ex, HttpServletRequest request) {
        log.warn("Error de validación en la petición: {}", ex.getMessage());

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Los campos enviados no cumplen las validaciones");
        problem.setTitle("Validation Error");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("field_errors", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }
}
```

---

## 4. Estrategia de Pruebas Automatizadas

En `back_factinterna` vimos dos niveles de pruebas que replicaremos aquí:

### A. Test Unitario con Mockito (`MockRouteMatcherServiceTest.java`)
Crea `src/test/java/com/mockengine/service/MockRouteMatcherServiceTest.java`:

```java
package com.mockengine.service;

import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.MockEndpointRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MockRouteMatcherServiceTest {

    @Mock
    private MockEndpointRepository mockEndpointRepository;

    @InjectMocks
    private MockRouteMatcherService routeMatcherService;

    @Test
    @DisplayName("Debe encontrar coincidencia por path variable y extraerla correctamente")
    void shouldMatchPatternWithPathVariable() {
        // Given
        MockEndpoint mock = MockEndpoint.builder()
                .id(1L)
                .name("Get User By ID")
                .httpMethod("GET")
                .pathPattern("/api/v1/users/{id}")
                .active(true)
                .build();

        when(mockEndpointRepository.findByActiveTrue()).thenReturn(List.of(mock));

        // When
        Optional<MockRouteMatcherService.MatchResult> result = 
                routeMatcherService.findMatch("GET", "/api/v1/users/42");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getEndpoint().getId()).isEqualTo(1L);
        assertThat(result.get().getPathVariables()).containsEntry("id", "42");
    }
}
```

### B. Test de Integración con PostgreSQL en Contenedor (`MockEngineIntegrationIT.java`)
Crea `src/test/java/com/mockengine/MockEngineIntegrationIT.java`:

```java
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
```

---

## 5. ¡Enhorabuena! Tu Roadmap está Completo

Siguiendo esta guía desde el módulo 01 hasta el 08 habrás dominado:
1. La arquitectura profesional por capas de Spring Boot observada en proyectos empresariales reales (`back_factinterna`).
2. El funcionamiento interno del `DispatcherServlet` y el enrutamiento dinámico en Spring MVC.
3. El uso avanzado de Jackson para manipular árboles JSON y evaluar plantillas dinámicas.
4. Concurrencia de última generación con **Virtual Threads de Java 21** para simulación de redes 3G/4G y latencia artificial sin degradación.
5. Persistencia robusta con PostgreSQL, Spring Data JPA y transacciones ACID.
6. Manejo global de excepciones conforme al estándar internacional RFC 7807 (`ProblemDetail`).
7. Pruebas automatizadas modernas con JUnit 5, Mockito y Testcontainers.

¡Empieza por el **[Módulo 02](./02-setup-inicial-docker-postgresql.md)** para levantar tu entorno y dar vida a tu herramienta!
