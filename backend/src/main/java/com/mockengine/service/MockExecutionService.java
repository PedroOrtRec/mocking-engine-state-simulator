package com.mockengine.service;

import com.mockengine.document.RequestAuditLogDocument;
import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.mongo.RequestAuditLogMongoRepository;
import com.mockengine.service.MockRouteMatcherService.MatchResult;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.Instant;
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
    private final RequestAuditLogMongoRepository auditLogMongoRepository;

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
                String errorJson = "{\"title\":\"Schema Validation Failed\",\"status\":400}";
                saveAuditLog(sessionKey, endpoint, httpMethod, subpath, HttpStatus.BAD_REQUEST.value(),
                        startTime, request, requestBody, errorJson);
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
        long effectiveDelayMs = endpoint.getDelayMs() != null ? endpoint.getDelayMs() : 0L;
        networkSimulationService.applyLatency(effectiveDelayMs);

        // 4. Inyección de caos / fallo aleatorio
        double effectiveErrorRate = endpoint.getErrorRate() != null ? endpoint.getErrorRate() : 0.0;
        if (networkSimulationService.shouldSimulateFailure(effectiveErrorRate)) {
            int failStatus = endpoint.getFailureStatusCode() != null ? endpoint.getFailureStatusCode() : 500;
            HttpStatus status = HttpStatus.valueOf(failStatus);
            String chaosErrorJson = String.format(
                    "{\"status\":%d,\"error\":\"%s\",\"message\":\"Simulación de fallo aleatorio del sistema (Chaos Engineering)\"}",
                    status.value(), status.getReasonPhrase()
            );
            saveAuditLog(sessionKey, endpoint, httpMethod, subpath, failStatus,
                    startTime, request, requestBody, chaosErrorJson);
            return buildErrorResponse(status, 
                    "Simulación de fallo aleatorio del sistema (Chaos Engineering)");
        }

        // 5. Cargar estado de sesión y aplicar mutaciones si existen
        Map<String, Object> currentState = stateManagementService.getState(sessionKey);
        if (endpoint.getStateUpdates() != null && !endpoint.getStateUpdates().isBlank()) {
            String evaluatedUpdates = jsonTemplateEngine.evaluateTemplate(
                    endpoint.getStateUpdates(),
                    match.getPathVariables(),
                    currentState,
                    requestBody
            );
            currentState = stateManagementService.applyStateMutations(sessionKey, evaluatedUpdates);
        }

        String evaluatedBody = jsonTemplateEngine.evaluateTemplate(
                endpoint.getResponseBody(), 
                match.getPathVariables(), 
                currentState,
                requestBody
        );

        // 6. Preparar cabeceras HTTP de respuesta
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Mock-Engine", "true");
        headers.set("X-Session-ID", sessionKey);

        // 7. Guardar log de auditoría en MongoDB
        saveAuditLog(sessionKey, endpoint, httpMethod, subpath, endpoint.getStatusCode(),
                startTime, request, requestBody, evaluatedBody);

        return ResponseEntity.status(endpoint.getStatusCode())
                .headers(headers)
                .body(evaluatedBody);
    }

    private void saveAuditLog(
            String sessionKey,
            MockEndpoint endpoint,
            String httpMethod,
            String subpath,
            Integer statusCode,
            long startTime,
            HttpServletRequest request,
            String requestBody,
            String responseBody
    ) {
        long durationMs = System.currentTimeMillis() - startTime;
        Map<String, String> requestHeaders = new HashMap<>();
        if (request.getHeaderNames() != null) {
            Collections.list(request.getHeaderNames()).forEach(headerName ->
                    requestHeaders.put(headerName, request.getHeader(headerName)));
        }

        auditLogMongoRepository.save(RequestAuditLogDocument.builder()
                .sessionKey(sessionKey)
                .ownerUsername(endpoint.getOwnerUsername())
                .httpMethod(httpMethod)
                .requestUri(subpath)
                .statusCode(statusCode)
                .durationMs(durationMs)
                .requestHeaders(requestHeaders)
                .requestBody(requestBody)
                .responseBody(responseBody)
                .timestamp(Instant.now())
                .build());
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
