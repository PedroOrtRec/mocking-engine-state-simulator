package com.mockengine.controller;

import com.mockengine.dto.auth.AuthResponse;
import com.mockengine.dto.auth.LoginRequest;
import com.mockengine.dto.auth.RegisterRequest;
import com.mockengine.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Petición REST de registro para usuario: {}", request.getUsername());
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("Petición REST de login para usuario: {}", request.getUsername());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/guest")
    public ResponseEntity<AuthResponse> guestSession() {
        log.info("Petición REST para generar sesión de invitado");
        AuthResponse response = authService.generateGuestSession();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
