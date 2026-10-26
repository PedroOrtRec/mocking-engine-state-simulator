package com.mockengine.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockengine.dto.MockEndpointDTO;
import com.mockengine.entity.MockEndpoint;
import com.mockengine.exception.GlobalExceptionHandler;
import com.mockengine.repository.jpa.MockEndpointRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class MockEndpointAdminControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private MockEndpointRepository mockRepository;

    @InjectMocks
    private MockEndpointAdminController controller;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Admin debe listar todos los mock endpoints de la plataforma")
    void listAll_Admin_ReturnsAllEndpoints() throws Exception {
        Authentication adminAuth = new UsernamePasswordAuthenticationToken(
                "admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        MockEndpoint ep1 = MockEndpoint.builder().id(1L).name("Mock 1").ownerUsername("pedro").build();
        MockEndpoint ep2 = MockEndpoint.builder().id(2L).name("Mock 2").ownerUsername("maria").build();

        when(mockRepository.findAll()).thenReturn(List.of(ep1, ep2));

        mockMvc.perform(get("/api/v1/admin/endpoints")
                        .principal(adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        verify(mockRepository).findAll();
        verify(mockRepository, never()).findByOwnerUsername(anyString());
    }

    @Test
    @DisplayName("Usuario regular solo debe listar sus propios mock endpoints")
    void listAll_RegularUser_ReturnsOnlyOwnedEndpoints() throws Exception {
        Authentication userAuth = new UsernamePasswordAuthenticationToken(
                "pedro", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

        MockEndpoint ep1 = MockEndpoint.builder().id(1L).name("Mock 1").ownerUsername("pedro").build();

        when(mockRepository.findByOwnerUsername("pedro")).thenReturn(List.of(ep1));

        mockMvc.perform(get("/api/v1/admin/endpoints")
                        .principal(userAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Mock 1"));

        verify(mockRepository).findByOwnerUsername("pedro");
        verify(mockRepository, never()).findAll();
    }

    @Test
    @DisplayName("Crear mock como invitado asigna ownerUsername y marca ephemeral=true")
    void create_GuestUser_SetsEphemeralTrue() throws Exception {
        Authentication guestAuth = new UsernamePasswordAuthenticationToken(
                "guest_12345678", null, List.of(new SimpleGrantedAuthority("ROLE_GUEST")));

        MockEndpointDTO dto = MockEndpointDTO.builder()
                .name("Guest Mock")
                .httpMethod("GET")
                .pathPattern("/test")
                .statusCode(200)
                .build();

        MockEndpoint saved = MockEndpoint.builder()
                .id(1L)
                .name("Guest Mock")
                .httpMethod("GET")
                .pathPattern("/test")
                .ownerUsername("guest_12345678")
                .ephemeral(true)
                .build();

        when(mockRepository.save(any(MockEndpoint.class))).thenReturn(saved);

        mockMvc.perform(post("/api/v1/admin/endpoints")
                        .principal(guestAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerUsername").value("guest_12345678"))
                .andExpect(jsonPath("$.ephemeral").value(true));
    }

    @Test
    @DisplayName("Eliminar mock de otro usuario sin ser admin debe retornar 403 Forbidden")
    void delete_NonOwner_ReturnsForbidden() throws Exception {
        Authentication userAuth = new UsernamePasswordAuthenticationToken(
                "pedro", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

        MockEndpoint existing = MockEndpoint.builder()
                .id(1L)
                .ownerUsername("maria")
                .build();

        when(mockRepository.findById(1L)).thenReturn(Optional.of(existing));

        mockMvc.perform(delete("/api/v1/admin/endpoints/1")
                        .principal(userAuth))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Forbidden"))
                .andExpect(jsonPath("$.error_code").value("ACCESS_DENIED"));

        verify(mockRepository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("Eliminar mock propio debe retornar 204 No Content")
    void delete_Owner_ReturnsNoContent() throws Exception {
        Authentication userAuth = new UsernamePasswordAuthenticationToken(
                "pedro", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

        MockEndpoint existing = MockEndpoint.builder()
                .id(1L)
                .ownerUsername("pedro")
                .build();

        when(mockRepository.findById(1L)).thenReturn(Optional.of(existing));

        mockMvc.perform(delete("/api/v1/admin/endpoints/1")
                        .principal(userAuth))
                .andExpect(status().isNoContent());

        verify(mockRepository).deleteById(1L);
    }
}
