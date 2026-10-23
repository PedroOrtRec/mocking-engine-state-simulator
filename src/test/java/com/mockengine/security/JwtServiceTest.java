package com.mockengine.security;

import com.mockengine.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;
    private static final String TEST_SECRET = "FRuiIhf6QbeeeaTFBD504NRfq+9VHfgNskdZyMBYdYM=";

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", TEST_SECRET);
        ReflectionTestUtils.setField(jwtService, "jwtExpirationMs", 3600000L); // 1 hora
    }

    @Test
    @DisplayName("Debe generar un token JWT válido y extraer el username correctamente")
    void shouldGenerateAndValidateToken() {
        // Given
        User user = User.builder()
                .username("testuser")
                .password("encoded_pass")
                .role(User.Role.ROLE_USER)
                .build();

        // When
        String token = jwtService.generateToken(user);

        // Then
        assertThat(token).isNotBlank();
        assertThat(jwtService.extractUsername(token)).isEqualTo("testuser");
        assertThat(jwtService.isTokenValid(token, user)).isTrue();
    }

    @Test
    @DisplayName("Debe invalidar el token si el username no coincide con el UserDetails")
    void shouldBeInvalidForDifferentUser() {
        // Given
        User user = User.builder()
                .username("realuser")
                .password("pass")
                .role(User.Role.ROLE_USER)
                .build();

        User impostor = User.builder()
                .username("impostor")
                .password("pass")
                .role(User.Role.ROLE_USER)
                .build();

        String token = jwtService.generateToken(user);

        // When & Then
        assertThat(jwtService.isTokenValid(token, impostor)).isFalse();
    }
}
