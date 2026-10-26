package com.mockengine.controller;

import com.mockengine.dto.UserSummaryDTO;
import com.mockengine.entity.User;
import com.mockengine.exception.GlobalExceptionHandler;
import com.mockengine.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserAdminControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @InjectMocks
    private UserAdminController userAdminController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(userAdminController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/admin/users debe retornar lista de usuarios")
    void listAllUsers_Success() throws Exception {
        UserSummaryDTO user1 = UserSummaryDTO.builder()
                .id(1L)
                .username("admin")
                .role(User.Role.ROLE_ADMIN)
                .createdAt(Instant.now())
                .build();

        when(userService.findAllUsers()).thenReturn(List.of(user1));

        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].username").value("admin"))
                .andExpect(jsonPath("$[0].role").value("ROLE_ADMIN"));
    }

    @Test
    @DisplayName("PATCH /api/v1/admin/users/{userId}/role debe retornar 204 No Content")
    void changeRole_Success() throws Exception {
        doNothing().when(userService).updateRole(1L, User.Role.ROLE_ADMIN);

        mockMvc.perform(patch("/api/v1/admin/users/1/role")
                        .param("newRole", "ROLE_ADMIN"))
                .andExpect(status().isNoContent());

        verify(userService).updateRole(1L, User.Role.ROLE_ADMIN);
    }

    @Test
    @DisplayName("DELETE /api/v1/admin/users/{userId} debe retornar 204 No Content")
    void deleteUser_Success() throws Exception {
        doNothing().when(userService).deleteUser(1L);

        mockMvc.perform(delete("/api/v1/admin/users/1"))
                .andExpect(status().isNoContent());

        verify(userService).deleteUser(1L);
    }

    @Test
    @DisplayName("DELETE /api/v1/admin/users/{userId} debe retornar 404 si el usuario no existe")
    void deleteUser_NotFound() throws Exception {
        doThrow(new EntityNotFoundException("Usuario no encontrado con ID: 99"))
                .when(userService).deleteUser(99L);

        mockMvc.perform(delete("/api/v1/admin/users/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Resource Not Found"))
                .andExpect(jsonPath("$.error_code").value("RESOURCE_NOT_FOUND"));
    }
}
