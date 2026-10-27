package com.mockengine.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockengine.dto.state.CreateStateRequest;
import com.mockengine.dto.state.ScenarioStateDTO;
import com.mockengine.dto.state.UpdateStateRequest;
import com.mockengine.exception.GlobalExceptionHandler;
import com.mockengine.service.StateManagementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ScenarioStateAdminControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private StateManagementService stateManagementService;

    @InjectMocks
    private ScenarioStateAdminController scenarioStateAdminController;

    private UsernamePasswordAuthenticationToken principal;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(scenarioStateAdminController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        principal = new UsernamePasswordAuthenticationToken(
                "pedro",
                "password",
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }

    @Test
    @DisplayName("GET /api/v1/admin/states debe listar los estados del usuario y default")
    void listStates_Success() throws Exception {
        ScenarioStateDTO dto = ScenarioStateDTO.builder()
                .id(1L)
                .name("default")
                .ownerUsername("system")
                .sessionKey("default")
                .system(true)
                .stateJson("{}")
                .lastAccessedAt(LocalDateTime.now())
                .build();

        when(stateManagementService.listUserStates("pedro")).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/admin/states").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("default"))
                .andExpect(jsonPath("$[0].system").value(true));

        verify(stateManagementService).listUserStates("pedro");
    }

    @Test
    @DisplayName("GET /api/v1/admin/states/{id} debe retornar el detalle de un estado")
    void getStateById_Success() throws Exception {
        ScenarioStateDTO dto = ScenarioStateDTO.builder()
                .id(2L)
                .name("carrito")
                .ownerUsername("pedro")
                .sessionKey("pedro:carrito")
                .system(false)
                .stateJson("{\"items\": 2}")
                .build();

        when(stateManagementService.getStateById(2L, "pedro")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/states/2").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2L))
                .andExpect(jsonPath("$.name").value("carrito"))
                .andExpect(jsonPath("$.sessionKey").value("pedro:carrito"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/states debe crear estado y retornar 201 Created")
    void createState_Success() throws Exception {
        CreateStateRequest req = CreateStateRequest.builder()
                .name("mi-nuevo-estado")
                .stateJson("{\"flag\": true}")
                .build();

        ScenarioStateDTO created = ScenarioStateDTO.builder()
                .id(3L)
                .name("mi-nuevo-estado")
                .ownerUsername("pedro")
                .sessionKey("pedro:mi-nuevo-estado")
                .system(false)
                .stateJson("{\"flag\": true}")
                .build();

        when(stateManagementService.createState(any(CreateStateRequest.class), eq("pedro"))).thenReturn(created);

        mockMvc.perform(post("/api/v1/admin/states")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(3L))
                .andExpect(jsonPath("$.name").value("mi-nuevo-estado"))
                .andExpect(jsonPath("$.sessionKey").value("pedro:mi-nuevo-estado"));
    }

    @Test
    @DisplayName("POST /api/v1/admin/states con nombre inválido debe retornar 400 Bad Request")
    void createState_ValidationError() throws Exception {
        CreateStateRequest req = CreateStateRequest.builder()
                .name("nombre con espacios!") // no cumple con ^[a-zA-Z0-9_-]+$
                .build();

        mockMvc.perform(post("/api/v1/admin/states")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation Error"))
                .andExpect(jsonPath("$.field_errors.name").exists());
    }

    @Test
    @DisplayName("POST /api/v1/admin/states cuando se supera la cuota debe retornar 400 Bad Request")
    void createState_QuotaExceeded() throws Exception {
        CreateStateRequest req = CreateStateRequest.builder()
                .name("estado-extra")
                .build();

        when(stateManagementService.createState(any(CreateStateRequest.class), eq("pedro")))
                .thenThrow(new IllegalStateException("Límite alcanzado: cada usuario puede crear un máximo de 5 estados"));

        mockMvc.perform(post("/api/v1/admin/states")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error_code").value("ILLEGAL_STATE"))
                .andExpect(jsonPath("$.detail").value("Límite alcanzado: cada usuario puede crear un máximo de 5 estados"));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/states/{id} debe actualizar estado y retornar 200 OK")
    void updateState_Success() throws Exception {
        UpdateStateRequest req = UpdateStateRequest.builder()
                .name("estado-renombrado")
                .build();

        ScenarioStateDTO updated = ScenarioStateDTO.builder()
                .id(2L)
                .name("estado-renombrado")
                .ownerUsername("pedro")
                .sessionKey("pedro:estado-renombrado")
                .system(false)
                .build();

        when(stateManagementService.updateState(eq(2L), any(UpdateStateRequest.class), eq("pedro")))
                .thenReturn(updated);

        mockMvc.perform(put("/api/v1/admin/states/2")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("estado-renombrado"));
    }

    @Test
    @DisplayName("DELETE /api/v1/admin/states/{id} debe eliminar y retornar 204 No Content")
    void deleteState_Success() throws Exception {
        doNothing().when(stateManagementService).deleteState(2L, "pedro");

        mockMvc.perform(delete("/api/v1/admin/states/2").principal(principal))
                .andExpect(status().isNoContent());

        verify(stateManagementService).deleteState(2L, "pedro");
    }

    @Test
    @DisplayName("DELETE /api/v1/admin/states/{id} sobre estado ajeno debe retornar 403 Forbidden")
    void deleteState_Forbidden() throws Exception {
        doThrow(new AccessDeniedException("No tienes permiso para eliminar este estado"))
                .when(stateManagementService).deleteState(99L, "pedro");

        mockMvc.perform(delete("/api/v1/admin/states/99").principal(principal))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error_code").value("ACCESS_DENIED"));
    }
}
