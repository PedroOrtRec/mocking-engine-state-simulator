package com.mockengine.service;

import com.mockengine.dto.UserSummaryDTO;
import com.mockengine.entity.User;
import com.mockengine.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("Debe listar todos los usuarios mapeados a UserSummaryDTO")
    void findAllUsers_Success() {
        User user1 = User.builder().id(1L).username("admin").role(User.Role.ROLE_ADMIN).createdAt(Instant.now()).build();
        User user2 = User.builder().id(2L).username("pedro").role(User.Role.ROLE_USER).createdAt(Instant.now()).build();

        when(userRepository.findAll()).thenReturn(List.of(user1, user2));

        List<UserSummaryDTO> dtos = userService.findAllUsers();

        assertThat(dtos).hasSize(2);
        assertThat(dtos.get(0).getUsername()).isEqualTo("admin");
        assertThat(dtos.get(0).getRole()).isEqualTo(User.Role.ROLE_ADMIN);
        assertThat(dtos.get(1).getUsername()).isEqualTo("pedro");
        assertThat(dtos.get(1).getRole()).isEqualTo(User.Role.ROLE_USER);
    }

    @Test
    @DisplayName("Debe actualizar el rol del usuario")
    void updateRole_Success() {
        User user = User.builder().id(1L).username("pedro").role(User.Role.ROLE_USER).build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        userService.updateRole(1L, User.Role.ROLE_ADMIN);

        assertThat(user.getRole()).isEqualTo(User.Role.ROLE_ADMIN);
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("Debe lanzar EntityNotFoundException si el usuario no existe al actualizar rol")
    void updateRole_NotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateRole(99L, User.Role.ROLE_ADMIN))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Usuario no encontrado");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Debe eliminar el usuario correctamente")
    void deleteUser_Success() {
        when(userRepository.existsById(1L)).thenReturn(true);

        userService.deleteUser(1L);

        verify(userRepository).deleteById(1L);
    }

    @Test
    @DisplayName("Debe lanzar EntityNotFoundException al intentar borrar usuario inexistente")
    void deleteUser_NotFound() {
        when(userRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> userService.deleteUser(99L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Usuario no encontrado");

        verify(userRepository, never()).deleteById(any());
    }
}
