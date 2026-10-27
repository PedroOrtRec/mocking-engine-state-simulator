package com.mockengine.controller;

import com.mockengine.dto.MockEndpointDTO;
import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.jpa.MockEndpointRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/endpoints")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'ADMIN', 'GUEST')")
@Tag(name = "Gestión de Endpoints Mock", description = "CRUD de endpoints simulados, contratos JSON Schema y simulación de red")
@Slf4j
public class MockEndpointAdminController {

    private final MockEndpointRepository mockRepository;

    @GetMapping
    public ResponseEntity<List<MockEndpoint>> listAll(Authentication authentication) {
        if (isAdmin(authentication) || authentication == null) {
            log.info("Acceso admin/sistema: listando todos los mock endpoints");
            return ResponseEntity.ok(mockRepository.findAll());
        }
        String currentUsername = authentication.getName();
        log.info("Listando mock endpoints segregados para usuario: {}", currentUsername);
        return ResponseEntity.ok(mockRepository.findByOwnerUsername(currentUsername));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MockEndpoint> getById(@PathVariable Long id, Authentication authentication) {
        MockEndpoint endpoint = mockRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mock no encontrado con ID: " + id));
        validateOwnershipOrAdmin(endpoint, authentication);
        return ResponseEntity.ok(endpoint);
    }

    @PostMapping
    @CacheEvict(value = "activeMockEndpoints", allEntries = true)
    public ResponseEntity<MockEndpoint> create(
            @Valid @RequestBody MockEndpointDTO dto,
            Authentication authentication
    ) {
        String ownerUsername = (authentication != null) ? authentication.getName() : "system";
        boolean ephemeral = isGuest(authentication);

        log.info("Creando nuevo mock endpoint: {} {} para propietario: {} (efímero: {})",
                dto.getHttpMethod(), dto.getPathPattern(), ownerUsername, ephemeral);

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
                .stateUpdates(dto.getStateUpdates())
                .active(dto.getActive() != null ? dto.getActive() : true)
                .ownerUsername(ownerUsername)
                .ephemeral(ephemeral)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(mockRepository.save(entity));
    }

    @PutMapping("/{id}")
    @CacheEvict(value = "activeMockEndpoints", allEntries = true)
    public ResponseEntity<MockEndpoint> update(
            @PathVariable Long id,
            @Valid @RequestBody MockEndpointDTO dto,
            Authentication authentication
    ) {
        log.info("Actualizando mock endpoint con ID: {}", id);

        MockEndpoint existing = mockRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mock no encontrado con ID: " + id));

        validateOwnershipOrAdmin(existing, authentication);

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
        existing.setStateUpdates(dto.getStateUpdates());
        existing.setActive(dto.getActive() != null ? dto.getActive() : true);

        return ResponseEntity.ok(mockRepository.save(existing));
    }

    @PatchMapping("/{id}/toggle")
    @CacheEvict(value = "activeMockEndpoints", allEntries = true)
    public ResponseEntity<MockEndpoint> toggleActive(@PathVariable Long id, Authentication authentication) {
        log.info("Cambiando estado de activación del mock endpoint con ID: {}", id);

        MockEndpoint existing = mockRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mock no encontrado con ID: " + id));

        validateOwnershipOrAdmin(existing, authentication);

        existing.setActive(!Boolean.TRUE.equals(existing.getActive()));

        return ResponseEntity.ok(mockRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    @CacheEvict(value = "activeMockEndpoints", allEntries = true)
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        MockEndpoint existing = mockRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mock no encontrado con ID: " + id));

        validateOwnershipOrAdmin(existing, authentication);

        mockRepository.deleteById(id);
        log.info("Mock endpoint eliminado con ID: {}", id);
        return ResponseEntity.noContent().build();
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private boolean isGuest(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_GUEST"));
    }

    private void validateOwnershipOrAdmin(MockEndpoint endpoint, Authentication authentication) {
        if (authentication == null) {
            return;
        }
        if (!isAdmin(authentication) && !endpoint.getOwnerUsername().equals(authentication.getName())) {
            throw new AccessDeniedException("No tienes permiso para acceder o modificar este recurso");
        }
    }
}
