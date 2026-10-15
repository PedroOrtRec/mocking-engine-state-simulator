package com.mockengine.service;

import com.mockengine.entity.MockEndpoint;
import com.mockengine.service.MockRouteMatcherService.MatchResult;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MockExecutionService {

    private final MockRouteMatcherService routeMatcherService;

    /**
     * Orquestador provisional para el Módulo 4:
     * Resuelve coincidencias de ruta mediante MockRouteMatcherService y retorna la respuesta configurada.
     * En los módulos 5, 6 y 7 se incorporará Jackson, latencia con Virtual Threads y persistencia de estado.
     */
    public ResponseEntity<?> executeMock(
            String httpMethod,
            String subpath,
            HttpServletRequest request,
            String requestBody
    ) {
        Optional<MatchResult> matchOpt = routeMatcherService.findMatch(httpMethod, subpath);

        if (matchOpt.isEmpty()) {
            log.warn("Mock no encontrado para [{} {}]", httpMethod, subpath);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(String.format("{\"error\": \"Mock not found for %s %s\"}", httpMethod, subpath));
        }

        MatchResult match = matchOpt.get();
        MockEndpoint endpoint = match.getEndpoint();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        return ResponseEntity.status(endpoint.getStatusCode() != null ? endpoint.getStatusCode() : 200)
                .headers(headers)
                .body(endpoint.getResponseBody() != null ? endpoint.getResponseBody() : "{}");
    }
}
