package com.mockengine.controller;

import com.mockengine.dto.state.CreateStateRequest;
import com.mockengine.dto.state.ScenarioStateDTO;
import com.mockengine.dto.state.UpdateStateRequest;
import com.mockengine.service.StateManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/states")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
@Slf4j
public class ScenarioStateAdminController {

    private final StateManagementService stateManagementService;

    @GetMapping
    public ResponseEntity<List<ScenarioStateDTO>> listStates(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "anonymous";
        log.info("Listando estados de escenario para usuario: {}", username);
        return ResponseEntity.ok(stateManagementService.listUserStates(username));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScenarioStateDTO> getStateById(@PathVariable Long id, Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "anonymous";
        log.info("Consultando estado id: {} para usuario: {}", id, username);
        return ResponseEntity.ok(stateManagementService.getStateById(id, username));
    }

    @PostMapping
    public ResponseEntity<ScenarioStateDTO> createState(
            @Valid @RequestBody CreateStateRequest request,
            Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : "anonymous";
        log.info("Creando nuevo estado de escenario '{}' para usuario: {}", request.getName(), username);
        ScenarioStateDTO created = stateManagementService.createState(request, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ScenarioStateDTO> updateState(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStateRequest request,
            Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : "anonymous";
        log.info("Actualizando estado id: {} para usuario: {}", id, username);
        ScenarioStateDTO updated = stateManagementService.updateState(id, request, username);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteState(@PathVariable Long id, Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "anonymous";
        log.info("Eliminando estado id: {} para usuario: {}", id, username);
        stateManagementService.deleteState(id, username);
        return ResponseEntity.noContent().build();
    }
}
