# Módulo 07: Escenarios con Estado y Máquinas de Transición

Uno de los mayores dolores de cabeza para los desarrolladores frontend y mobile es probar **flujos dependientes de estado**:
- "¿Qué pasa si intento ver mi perfil sin haberme logueado previamente?" (401 Unauthorized).
- "¿Qué pasa si compro un producto y se agota el stock en el segundo intento?" (409 Conflict / Out of stock).
- "¿Qué pasa si un usuario supera el saldo permitido en su cuenta bancaria?"

En este módulo construiremos el **motor de estado con aislamiento por sesión**.

---

## 1. El Concepto de Estado por Sesión (`X-Session-ID`)

Para que dos compañeros del equipo frontend no pisen el estado del otro mientras prueban la aplicación a la vez, cada cliente se identifica mediante una cabecera HTTP:
- Cabecera: `X-Session-ID: <uuid-o-nombre-dispositivo>`

Si un desarrollador no envía la cabecera, se asume una sesión por defecto (`default-session`).

```
Mobile App (Dispositivo A)           Mobile App (Dispositivo B)
X-Session-ID: "pixel-7-juan"         X-Session-ID: "iphone-15-laura"
        │                                    │
        ▼                                    ▼
┌────────────────────────────────────────────────────────┐
│               Mocking Engine State Store               │
│                                                        │
│  "pixel-7-juan"        --> { "auth": false, "stock": 2 }
│  "iphone-15-laura"     --> { "auth": true,  "stock": 0 }
└────────────────────────────────────────────────────────┘
```

---

## 2. Servicio de Gestión de Estado: `StateManagementService`

Este servicio carga el estado de la sesión desde PostgreSQL (o memoria), permite leer variables y actualizarlas atómicamente.

Crea el archivo `com.mockengine.service.StateManagementService.java`:

```java
package com.mockengine.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockengine.entity.ScenarioState;
import com.mockengine.repository.ScenarioStateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class StateManagementService {

    private final ScenarioStateRepository scenarioStateRepository;
    private final ObjectMapper objectMapper;

    /**
     * Obtiene el mapa de variables de estado para una sesión concreta.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getState(String sessionKey) {
        return scenarioStateRepository.findBySessionKey(sessionKey)
                .map(this::deserializeState)
                .orElseGet(HashMap::new);
    }

    /**
     * Actualiza una o más variables de estado para una sesión.
     */
    @Transactional
    public void updateState(String sessionKey, Map<String, Object> newValues) {
        ScenarioState stateEntity = scenarioStateRepository.findBySessionKey(sessionKey)
                .orElseGet(() -> ScenarioState.builder()
                        .sessionKey(sessionKey)
                        .stateJson("{}")
                        .build());

        Map<String, Object> currentState = deserializeState(stateEntity);
        currentState.putAll(newValues);

        try {
            stateEntity.setStateJson(objectMapper.writeValueAsString(currentState));
            scenarioStateRepository.save(stateEntity);
            log.debug("Estado actualizado para sesión [{}]: {}", sessionKey, currentState);
        } catch (Exception e) {
            log.error("Error al serializar el estado de sesión: {}", e.getMessage());
        }
    }

    /**
     * Reinicia el estado de una sesión (útil para botones de 'Reset' en las pruebas frontend).
     */
    @Transactional
    public void resetState(String sessionKey) {
        scenarioStateRepository.deleteBySessionKey(sessionKey);
        log.info("Estado reseteado para la sesión [{}]", sessionKey);
    }

    private Map<String, Object> deserializeState(ScenarioState entity) {
        try {
            return objectMapper.readValue(entity.getStateJson(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("No se pudo deserializar stateJson para sesión {}. Creando estado vacío.", entity.getSessionKey());
            return new HashMap<>();
        }
    }
}
```

---

## 3. Orquestador Central: `MockExecutionService`

Ahora unimos todas las piezas creadas en los módulos anteriores:
1. Resolución de ruta con `MockRouteMatcherService`.
2. Identificación de sesión (`X-Session-ID`).
3. Lectura de estado con `StateManagementService`.
4. Validación de JSON Schema con `JsonSchemaValidationService`.
5. Simulación de latencia y fallo con `NetworkSimulationService`.
6. Interpolación de plantillas con `JsonTemplateEngine`.
7. Registro de auditoría en PostgreSQL con `RequestAuditLogRepository`.

Crea el archivo `com.mockengine.service.MockExecutionService.java`:

```java
package com.mockengine.service;

import com.mockengine.entity.MockEndpoint;
import com.mockengine.entity.RequestAuditLog;
import com.mockengine.repository.RequestAuditLogRepository;
import com.mockengine.service.MockRouteMatcherService.MatchResult;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MockExecutionService {

    private final MockRouteMatcherService routeMatcherService;
    private final StateManagementService stateManagementService;
    private final NetworkSimulationService networkSimulationService;
    private final JsonTemplateEngine jsonTemplateEngine;
    private final JsonSchemaValidationService schemaValidationService;
    private final RequestAuditLogRepository auditLogRepository;

    public ResponseEntity<?> executeMock(
            String httpMethod, 
            String subpath, 
            HttpServletRequest request, 
            String requestBody
    ) {
        long startTime = System.currentTimeMillis();
        String sessionKey = Optional.ofNullable(request.getHeader("X-Session-ID"))
                .filter(s -> !s.isBlank())
                .orElse("default-session");

        // 1. Resolver el mock en base de datos
        Optional<MatchResult> matchOpt = routeMatcherService.findMatch(httpMethod, subpath);
        if (matchOpt.isEmpty()) {
            return buildErrorResponse(HttpStatus.NOT_FOUND, 
                    "No hay ningún mock registrado para: " + httpMethod + " " + subpath);
        }

        MatchResult match = matchOpt.get();
        MockEndpoint endpoint = match.getEndpoint();

        // 2. Validar contrato de petición si tiene JSON Schema asociado
        if (endpoint.getRequestSchema() != null && !endpoint.getRequestSchema().isBlank()) {
            List<String> schemaErrors = schemaValidationService.validatePayload(
                    endpoint.getRequestSchema(), requestBody);
            if (!schemaErrors.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "title", "Schema Validation Failed",
                                "status", 400,
                                "errors", schemaErrors
                        ));
            }
        }

        // 3. Aplicar latencia móvil simulada (3G / 4G con Virtual Threads)
        networkSimulationService.applyLatency(endpoint.getDelayMs());

        // 4. Inyección de caos / fallo aleatorio
        if (networkSimulationService.shouldSimulateFailure(endpoint.getErrorRate())) {
            int failStatus = endpoint.getFailureStatusCode() != null ? endpoint.getFailureStatusCode() : 500;
            return buildErrorResponse(HttpStatus.valueOf(failStatus), 
                    "Simulación de fallo aleatorio del sistema (Chaos Engineering)");
        }

        // 5. Cargar estado de sesión y evaluar la plantilla JSON
        Map<String, Object> currentState = stateManagementService.getState(sessionKey);
        String evaluatedBody = jsonTemplateEngine.evaluateTemplate(
                endpoint.getResponseBody(), 
                match.getPathVariables(), 
                currentState
        );

        // 6. Preparar cabeceras HTTP de respuesta
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Mock-Engine", "true");
        headers.set("X-Session-ID", sessionKey);

        long durationMs = System.currentTimeMillis() - startTime;

        // 7. Guardar log de auditoría en PostgreSQL
        auditLogRepository.save(RequestAuditLog.builder()
                .sessionKey(sessionKey)
                .httpMethod(httpMethod)
                .requestUri(subpath)
                .statusCode(endpoint.getStatusCode())
                .durationMs(durationMs)
                .requestBody(requestBody)
                .responseBody(evaluatedBody)
                .timestamp(LocalDateTime.now())
                .build());

        return ResponseEntity.status(endpoint.getStatusCode())
                .headers(headers)
                .body(evaluatedBody);
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(HttpStatus status, String detail) {
        return ResponseEntity.status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "status", status.value(),
                        "error", status.getReasonPhrase(),
                        "message", detail
                ));
    }
}
```

---

## 4. Ejemplo Práctico: Flujo de Compra con Estado

Imagina que registras dos endpoints en el sistema:

1. **`POST /api/v1/auth/login`**:
   - Devuelve `{"token": "xyz-123", "role": "USER"}`
   - Efecto en estado: `isLoggedIn = true, stock = 2`

2. **`POST /api/v1/cart/checkout`**:
   - Plantilla de respuesta: `{"message": "Compra exitosa", "stockRestante": {{state.stock}}}`

Si un desarrollador mobile hace:
1. `GET /mock/api/v1/products` con `X-Session-ID: dev-pedro` -> Ve stock disponible.
2. `POST /mock/api/v1/cart/checkout` con `X-Session-ID: dev-pedro` -> El stock disminuye sólo para su dispositivo.
3. Otro compañero con `X-Session-ID: dev-maria` mantiene su stock intacto.

Siguiente paso: **[Módulo 08: API de Gestión, Logs y Testing](./08-api-gestion-logs-y-testing.md)**.
