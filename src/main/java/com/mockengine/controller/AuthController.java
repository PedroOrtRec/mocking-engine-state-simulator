package com.mockengine.controller;

import com.mockengine.dto.auth.AuthResponse;
import com.mockengine.dto.auth.LoginRequest;
import com.mockengine.dto.auth.RegisterRequest;
import com.mockengine.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Autenticación", description = "Endpoints para registro, login y sesiones efímeras de invitado")
@Slf4j
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Registrar nuevo usuario", description = "Crea una cuenta con rol USER y devuelve un token JWT")
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Petición REST de registro para usuario: {}", request.getUsername());
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "Iniciar sesión", description = "Autentica credenciales y genera un token JWT con los roles del usuario")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("Petición REST de login para usuario: {}", request.getUsername());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Crear sesión efímera de invitado", description = "Genera un token JWT temporal y un espacio de nombres con TTL de 24h en Redis")
    @PostMapping("/guest")
    public ResponseEntity<AuthResponse> guestSession() {
        log.info("Petición REST para generar sesión de invitado");
        AuthResponse response = authService.generateGuestSession();
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
