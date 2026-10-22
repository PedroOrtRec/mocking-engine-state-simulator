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

    @PutMapping("/{id}")
    public ResponseEntity<MockEndpoint> update(
            @PathVariable Long id,
            @Valid @RequestBody MockEndpointDTO dto
    ) {
        log.info("Actualizando mock endpoint con ID: {}", id);

        MockEndpoint existing = mockRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mock no encontrado con ID: " + id));

        existing.setName(dto.getName());
        existing.setHttpMethod(dto.getHttpMethod().toUpperCase());
        existing.setPathPattern(dto.getPathPattern());
        existing.setStatusCode(dto.getStatusCode());
        existing.setResponseBody(dto.getResponseBody());
        existing.setResponseHeaders(dto.getResponseHeaders());
        existing.setDelayMs(dto.getDelayMs() != null ? dto.getDelayMs() : 0L);
        existing.setErrorRate(dto.getErrorRate() != null ? dto.getErrorRate() : 0.0);
        existing.setFailureStatusCode(dto.getFailureStatusCode() != null ? dto.getFailureStatusCode() : 500);
        existing.setRequestSchema(dto.getRequestSchema());
        existing.setActive(dto.getActive() != null ? dto.getActive() : true);

        return ResponseEntity.ok(mockRepository.save(existing));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<MockEndpoint> toggleActive(@PathVariable Long id) {
        log.info("Cambiando estado de activación del mock endpoint con ID: {}", id);

        MockEndpoint existing = mockRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mock no encontrado con ID: " + id));

        existing.setActive(!Boolean.TRUE.equals(existing.getActive()));

        return ResponseEntity.ok(mockRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!mockRepository.existsById(id)) {
            throw new EntityNotFoundException("Mock no encontrado con ID: " + id);
        }
        mockRepository.deleteById(id);
        log.info("Mock endpoint eliminado con ID: {}", id);
        return ResponseEntity.noContent().build();
    }
}
