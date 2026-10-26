package com.mockengine.service;

import com.mockengine.dto.auth.AuthResponse;
import com.mockengine.dto.auth.LoginRequest;
import com.mockengine.dto.auth.RegisterRequest;
import com.mockengine.entity.User;
import com.mockengine.repository.UserRepository;
import com.mockengine.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "jwtExpirationMs", 86400000L);
    }

    @Test
    @DisplayName("Debe registrar un nuevo usuario y retornar token JWT exitosamente")
    void register_Success() {
        // Given
        RegisterRequest request = RegisterRequest.builder()
                .username("pedro")
                .password("supersecret123")
                .build();

        User savedUser = User.builder()
                .id(1L)
                .username("pedro")
                .password("hashed_pwd")
                .role(User.Role.ROLE_USER)
                .build();

        when(userRepository.existsByUsername("pedro")).thenReturn(false);
        when(passwordEncoder.encode("supersecret123")).thenReturn("hashed_pwd");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateToken(savedUser)).thenReturn("mocked.jwt.token");

        // When
        AuthResponse response = authService.register(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("mocked.jwt.token");
        assertThat(response.getType()).isEqualTo("Bearer");
        assertThat(response.getUsername()).isEqualTo("pedro");
        assertThat(response.getRole()).isEqualTo("ROLE_USER");
        assertThat(response.getExpiresInMs()).isEqualTo(86400000L);

        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Debe lanzar IllegalArgumentException si el nombre de usuario ya está registrado")
    void register_DuplicateUsername_ThrowsException() {
        // Given
        RegisterRequest request = RegisterRequest.builder()
                .username("pedro")
                .password("supersecret123")
                .build();

        when(userRepository.existsByUsername("pedro")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("El nombre de usuario ya está en uso");

        verify(userRepository, never()).save(any());
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    @DisplayName("Debe autenticar correctamente y retornar token JWT al hacer login")
    void login_Success() {
        // Given
        LoginRequest request = LoginRequest.builder()
                .username("pedro")
                .password("supersecret123")
                .build();

        User user = User.builder()
                .id(1L)
                .username("pedro")
                .password("hashed_pwd")
                .role(User.Role.ROLE_USER)
                .build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("pedro", "supersecret123"));
        when(userRepository.findByUsername("pedro")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user)).thenReturn("mocked.jwt.token");

        // When
        AuthResponse response = authService.login(request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("mocked.jwt.token");
        assertThat(response.getUsername()).isEqualTo("pedro");
        assertThat(response.getRole()).isEqualTo("ROLE_USER");
        assertThat(response.getExpiresInMs()).isEqualTo(86400000L);

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    @DisplayName("Debe propagar BadCredentialsException si las credenciales son incorrectas")
    void login_InvalidCredentials_ThrowsBadCredentialsException() {
        // Given
        LoginRequest request = LoginRequest.builder()
                .username("pedro")
                .password("wrongpassword")
                .build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        // When & Then
        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Bad credentials");

        verify(jwtService, never()).generateToken(any());
    }

    @Test
    @DisplayName("Debe generar sesión efímera para invitado con ROLE_GUEST")
    void generateGuestSession_Success() {
        // Given
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_guest_uuid");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateToken(any(User.class))).thenReturn("guest.jwt.token");

        // When
        AuthResponse response = authService.generateGuestSession();

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("guest.jwt.token");
        assertThat(response.getUsername()).startsWith("guest_");
        assertThat(response.getRole()).isEqualTo("ROLE_GUEST");
        assertThat(response.getType()).isEqualTo("Bearer");
        assertThat(response.getExpiresInMs()).isEqualTo(86400000L);

        verify(userRepository).save(any(User.class));
        verify(jwtService).generateToken(any(User.class));
    }
}
