package com.mockengine.controller;

import com.mockengine.dto.state.CreateStateRequest;
import com.mockengine.dto.state.ScenarioStateDTO;
import com.mockengine.dto.state.UpdateStateRequest;
import com.mockengine.service.StateManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@PreAuthorize("hasAnyRole('USER', 'ADMIN', 'GUEST')")
@Tag(name = "Gestión de Estados de Escenario", description = "CRUD de escenarios con estado 1:N aislados por usuario y control de cuotas")
@Slf4j
public class ScenarioStateAdminController {

    private final StateManagementService stateManagementService;

    @Operation(summary = "Listar estados del usuario", description = "Devuelve los estados creados por el usuario más el estado por defecto del sistema")
    @GetMapping
    public ResponseEntity<List<ScenarioStateDTO>> listStates(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "anonymous";
        log.info("Listando estados de escenario para usuario: {}", username);
        return ResponseEntity.ok(stateManagementService.listUserStates(username));
    }

    @Operation(summary = "Consultar estado por ID", description = "Obtiene los detalles y variables de un estado de escenario propio o de sistema")
    @GetMapping("/{id}")
    public ResponseEntity<ScenarioStateDTO> getStateById(@PathVariable Long id, Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "anonymous";
        log.info("Consultando estado id: {} para usuario: {}", id, username);
        return ResponseEntity.ok(stateManagementService.getStateById(id, username));
    }

    @Operation(summary = "Crear nuevo estado", description = "Crea un nuevo estado aislado (máximo 5 por usuario) con namespace usuario:nombre")
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

    @Operation(summary = "Actualizar estado", description = "Modifica el nombre o variables JSON de un estado propio")
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

    @Operation(summary = "Eliminar estado", description = "Elimina un estado propio (el estado del sistema no puede eliminarse)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteState(@PathVariable Long id, Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "anonymous";
        log.info("Eliminando estado id: {} para usuario: {}", id, username);
        stateManagementService.deleteState(id, username);
        return ResponseEntity.noContent().build();
    }
}
