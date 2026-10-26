package com.mockengine.service;

import com.mockengine.dto.UserSummaryDTO;
import com.mockengine.entity.User;
import com.mockengine.repository.jpa.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserSummaryDTO> findAllUsers() {
        log.info("Listando todos los usuarios registrados en la plataforma");
        return userRepository.findAll().stream()
                .map(UserSummaryDTO::fromEntity)
                .toList();
    }

    @Transactional
    public void updateRole(Long userId, User.Role newRole) {
        log.info("Actualizando rol del usuario {} a {}", userId, newRole);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado con ID: " + userId));

        user.setRole(newRole);
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long userId) {
        log.info("Eliminando usuario con ID: {}", userId);
        if (!userRepository.existsById(userId)) {
            throw new EntityNotFoundException("Usuario no encontrado con ID: " + userId);
        }
        userRepository.deleteById(userId);
    }
}
