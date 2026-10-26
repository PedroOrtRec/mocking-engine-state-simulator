package com.mockengine.service;

import com.mockengine.dto.auth.AuthResponse;
import com.mockengine.dto.auth.LoginRequest;
import com.mockengine.dto.auth.RegisterRequest;
import com.mockengine.entity.User;
import com.mockengine.repository.UserRepository;
import com.mockengine.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final AuthenticationManager authenticationManager;

  @Value("${app.jwt.expiration-ms:86400000}")
  private long jwtExpirationMs;

  @Transactional
  public AuthResponse register(RegisterRequest request) {
    log.info("Procesando registro para usuario: {}", request.getUsername());

    if (userRepository.existsByUsername(request.getUsername())) {
      throw new IllegalArgumentException("El nombre de usuario ya está en uso: " + request.getUsername());
    }

    User user = User.builder()
        .username(request.getUsername())
        .password(passwordEncoder.encode(request.getPassword()))
        .role(User.Role.ROLE_USER)
        .build();

    User savedUser = userRepository.save(user);
    String token = jwtService.generateToken(savedUser);

    log.info("Usuario registrado exitosamente con ID: {}", savedUser.getId());

    return AuthResponse.builder()
        .token(token)
        .type("Bearer")
        .username(savedUser.getUsername())
        .role(savedUser.getRole().name())
        .expiresInMs(jwtExpirationMs)
        .build();
  }

  public AuthResponse login(LoginRequest request) {
    log.info("Procesando inicio de sesión para usuario: {}", request.getUsername());

    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

    User user = userRepository.findByUsername(request.getUsername())
        .orElseThrow(
            () -> new IllegalArgumentException("Usuario no encontrado tras autenticación: " + request.getUsername()));

    String token = jwtService.generateToken(user);

    log.info("Inicio de sesión exitoso para usuario: {}", user.getUsername());

    return AuthResponse.builder()
        .token(token)
        .type("Bearer")
        .username(user.getUsername())
        .role(user.getRole().name())
        .expiresInMs(jwtExpirationMs)
        .build();
  }

  @Transactional
  public AuthResponse generateGuestSession() {
    String guestId = "guest_" + UUID.randomUUID().toString().substring(0, 8);
    log.info("Generando sesión efímera para invitado: {}", guestId);

    User guestUser = User.builder()
        .username(guestId)
        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
        .role(User.Role.ROLE_GUEST)
        .build();

    userRepository.save(guestUser);

    String token = jwtService.generateToken(guestUser);

    return AuthResponse.builder()
        .token(token)
        .type("Bearer")
        .username(guestId)
        .role(User.Role.ROLE_GUEST.name())
        .expiresInMs(jwtExpirationMs)
        .build();
  }
}
