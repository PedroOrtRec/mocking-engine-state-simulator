package com.mockengine.config;

import com.mockengine.entity.User;
import com.mockengine.repository.jpa.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminDataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.password:admin123456}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminUsername == null || adminUsername.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.warn("Credenciales de admin por defecto en blanco; se omite la inicialización del usuario administrador.");
            return;
        }

        userRepository.findByUsername(adminUsername).ifPresentOrElse(
                existingUser -> {
                    if (existingUser.getRole() != User.Role.ROLE_ADMIN) {
                        existingUser.setRole(User.Role.ROLE_ADMIN);
                        userRepository.save(existingUser);
                        log.info("Usuario existente '{}' promovido a ROLE_ADMIN.", adminUsername);
                    } else {
                        log.debug("El usuario administrador por defecto '{}' ya existe en PostgreSQL.", adminUsername);
                    }
                },
                () -> {
                    User adminUser = User.builder()
                            .username(adminUsername)
                            .password(passwordEncoder.encode(adminPassword))
                            .role(User.Role.ROLE_ADMIN)
                            .build();
                    userRepository.save(adminUser);
                    log.info("Usuario administrador por defecto '{}' creado en PostgreSQL con ROLE_ADMIN.", adminUsername);
                }
        );
    }
}
