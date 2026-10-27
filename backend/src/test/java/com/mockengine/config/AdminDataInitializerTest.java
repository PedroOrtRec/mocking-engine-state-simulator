package com.mockengine.config;

import com.mockengine.entity.User;
import com.mockengine.repository.jpa.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminDataInitializerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminDataInitializer adminDataInitializer;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(adminDataInitializer, "adminUsername", "admin");
        ReflectionTestUtils.setField(adminDataInitializer, "adminPassword", "admin123456");
    }

    @Test
    @DisplayName("Debe crear el usuario admin con contraseña BCrypt y ROLE_ADMIN si no existe en PostgreSQL")
    void shouldCreateAdminUserWhenNotFound() {
        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("admin123456")).thenReturn("$2a$10$hashedAdminPassword");

        adminDataInitializer.run(new DefaultApplicationArguments());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());

        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getUsername()).isEqualTo("admin");
        assertThat(savedUser.getPassword()).isEqualTo("$2a$10$hashedAdminPassword");
        assertThat(savedUser.getRole()).isEqualTo(User.Role.ROLE_ADMIN);
    }

    @Test
    @DisplayName("No debe duplicar ni sobreescribir el usuario admin si ya existe con ROLE_ADMIN")
    void shouldDoNothingWhenAdminAlreadyExistsWithAdminRole() {
        User existingAdmin = User.builder()
                .id(1L)
                .username("admin")
                .password("$2a$10$existingHash")
                .role(User.Role.ROLE_ADMIN)
                .build();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(existingAdmin));

        adminDataInitializer.run(new DefaultApplicationArguments());

        verify(userRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    @DisplayName("Debe promover el usuario a ROLE_ADMIN si ya existía con otro rol")
    void shouldPromoteExistingUserToAdminIfRoleWasDifferent() {
        User existingUser = User.builder()
                .id(2L)
                .username("admin")
                .password("$2a$10$existingHash")
                .role(User.Role.ROLE_USER)
                .build();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(existingUser));

        adminDataInitializer.run(new DefaultApplicationArguments());

        assertThat(existingUser.getRole()).isEqualTo(User.Role.ROLE_ADMIN);
        verify(userRepository).save(existingUser);
    }
}
