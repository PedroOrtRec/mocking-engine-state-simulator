package com.mockengine.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockengine.dto.auth.AuthResponse;
import com.mockengine.dto.auth.LoginRequest;
import com.mockengine.dto.auth.RegisterRequest;
import com.mockengine.exception.GlobalExceptionHandler;
import com.mockengine.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/auth/register debe responder 201 Created con token JWT al registrar usuario válido")
    void register_ValidRequest_ReturnsCreated() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .username("pedro")
                .password("supersecret123")
                .build();

        AuthResponse response = AuthResponse.builder()
                .token("jwt.token.mocked")
                .type("Bearer")
                .username("pedro")
                .role("ROLE_USER")
                .expiresInMs(86400000L)
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("jwt.token.mocked"))
                .andExpect(jsonPath("$.type").value("Bearer"))
                .andExpect(jsonPath("$.username").value("pedro"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"))
                .andExpect(jsonPath("$.expiresInMs").value(86400000L));
    }

    @Test
    @DisplayName("POST /api/v1/auth/register debe responder 400 Bad Request si la validación falla")
    void register_InvalidRequest_ReturnsBadRequest() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .username("") // Inválido: NotBlank
                .password("123") // Inválido: Tamaño mínimo 6
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation Error"))
                .andExpect(jsonPath("$.field_errors.username").exists())
                .andExpect(jsonPath("$.field_errors.password").exists());
    }

    @Test
    @DisplayName("POST /api/v1/auth/login debe responder 200 OK con token JWT para credenciales válidas")
    void login_ValidRequest_ReturnsOk() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .username("pedro")
                .password("supersecret123")
                .build();

        AuthResponse response = AuthResponse.builder()
                .token("jwt.token.mocked")
                .type("Bearer")
                .username("pedro")
                .role("ROLE_USER")
                .expiresInMs(86400000L)
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt.token.mocked"))
                .andExpect(jsonPath("$.username").value("pedro"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login debe responder 401 Unauthorized cuando las credenciales no son válidas")
    void login_InvalidCredentials_ReturnsUnauthorized() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .username("pedro")
                .password("wrongpassword")
                .build();

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.title").value("Unauthorized"))
                .andExpect(jsonPath("$.error_code").value("BAD_CREDENTIALS"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/guest debe responder 201 Created con token efímero de invitado")
    void guest_ReturnsCreatedWithGuestToken() throws Exception {
        AuthResponse response = AuthResponse.builder()
                .token("jwt.guest.token")
                .type("Bearer")
                .username("guest_abcd1234")
                .role("ROLE_GUEST")
                .expiresInMs(86400000L)
                .build();

        when(authService.generateGuestSession()).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/guest"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("jwt.guest.token"))
                .andExpect(jsonPath("$.type").value("Bearer"))
                .andExpect(jsonPath("$.username").value("guest_abcd1234"))
                .andExpect(jsonPath("$.role").value("ROLE_GUEST"))
                .andExpect(jsonPath("$.expiresInMs").value(86400000L));
    }
}
