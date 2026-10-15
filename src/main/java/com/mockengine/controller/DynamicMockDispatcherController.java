package com.mockengine.controller;

import com.mockengine.service.MockExecutionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mock")
@RequiredArgsConstructor
@Slf4j
public class DynamicMockDispatcherController {

    private final MockExecutionService mockExecutionService;

    /**
     * Intercepta cualquier método HTTP bajo la ruta /mock/**
     */
    @RequestMapping("/**")
    public ResponseEntity<?> handleMockRequest(
            HttpServletRequest request,
            @RequestBody(required = false) String requestBody
    ) {
        // 1. Extraemos la subruta relativa (ej: de "/mock/api/v1/users/42" obtenemos "/api/v1/users/42")
        String fullPath = request.getRequestURI();
        String subpath = fullPath.substring("/mock".length());
        if (subpath.isEmpty()) {
            subpath = "/";
        }

        String method = request.getMethod();
        log.info("Petición interceptada: [{} {}]", method, subpath);

        // 2. Delegamos la ejecución del mock al servicio orquestador
        return mockExecutionService.executeMock(method, subpath, request, requestBody);
    }
}
