# Módulo 09: Autenticación Stateless con Spring Security 6 y JWT

En este módulo sentarás las bases de seguridad de la aplicación utilizando **Spring Security 6** (Spring Boot 3.3+) y **JSON Web Tokens (JWT)**.

---

## 🎯 Objetivos de Aprendizaje

1. Entender la arquitectura moderna de **Spring Security 6**: sustitución de clases heredadas (`WebSecurityConfigurerAdapter`) por el patrón moderno de componentes basados en `@Bean` (`SecurityFilterChain`).
2. Configurar una estrategia de sesiones **Stateless** (sin cookies ni estado en memoria del servidor), ideal para arquitecturas REST y microservicios.
3. Hashing seguro de contraseñas con **BCrypt**.
4. Emisión y validación criptográfica de tokens **JWT** (firmados con algoritmo HMAC-SHA256).
5. Intercepción de peticiones HTTP mediante un filtro personalizado `OncePerRequestFilter`.

---

## 1. Fundamentos Teóricos: El Flujo Stateless con JWT

En una aplicación web tradicional, el servidor guarda la sesión del usuario en memoria RAM o Redis y envía una cookie con una `JSESSIONID`. En APIs REST modernas esto genera problemas de escalabilidad horizontal.

Con **JWT Stateless**:
1. El usuario envía sus credenciales (`username` + `password`) a `/api/v1/auth/login`.
2. Si son válidas, el servidor genera un token firmado criptográficamente que contiene el `sub` (username) y los `roles`.
3. El cliente almacena el token y lo envía en cada petición sucesiva en la cabecera:
   ```http
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
   ```
4. El servidor verifica la firma matemática del token sin necesidad de consultar la base de datos en cada llamada.

---

## 2. Dependencias en `pom.xml`

Para habilitar la seguridad y la manipulación de JWT, agregamos a `pom.xml`:

```xml
<!-- Spring Security Starter -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- JJWT: Librería moderna para creación y parseo de JSON Web Tokens -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```

---

## 3. Modelo de Dominio: Entidad `User` y `Role`

Creamos la entidad en el paquete `com.mockengine.entity`:

```java
package com.mockengine.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public enum Role {
        ROLE_USER,
        ROLE_ADMIN
    }

    // Métodos del contrato UserDetails de Spring Security:
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }
}
```

---

## 3.1. Repositorio de Usuarios: `UserRepository`

Creamos la interfaz en el paquete `com.mockengine.repository`:

```java
package com.mockengine.repository;

import com.mockengine.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Spring Data JPA deriva automáticamente la consulta: SELECT * FROM users WHERE username = ?
    Optional<User> findByUsername(String username);

    // Validación rápida para el registro de nuevos usuarios:
    boolean existsByUsername(String username);
}
```

---

## 3.2. Conexión con Spring Security: `CustomUserDetailsService`

Spring Security necesita un componente que implemente `UserDetailsService` para consultar a PostgreSQL mediante `UserRepository`. Creamos `com.mockengine.security.CustomUserDetailsService`:

```java
package com.mockengine.security;

import com.mockengine.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con username: " + username));
    }
}
```

---

## 4. Servicio de Generación y Validación de JWT (`JwtService`)

Creamos el servicio `com.mockengine.security.JwtService`:

```java
package com.mockengine.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${app.jwt.secret:ClaveSecretaMuyLargaYSeguraParaHMACSHA256DeMinimo32Caracteres}")
    private String secretKey;

    @Value("${app.jwt.expiration-ms:86400000}") // 24 horas por defecto
    private long jwtExpirationMs;

    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("roles", userDetails.getAuthorities())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claimsResolver.apply(claims);
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = io.jsonwebtoken.io.Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
```

> [!TIP]
> **Gestión Segura de Secretos:** La clave `app.jwt.secret` se inyecta desde la variable de entorno `JWT_SECRET` definida en tu archivo local `.env` (ignorado por Git). En el repositorio se versiona `.env.example` como plantilla para que cualquier desarrollador sepa qué variables configurar sin exponer claves reales.

---

## 5. El Filtro de Autenticación (`JwtAuthenticationFilter`)

Intercepta cada petición entrante, busca la cabecera `Authorization: Bearer <token>`, valida la firma y puebla el `SecurityContextHolder`:

```java
package com.mockengine.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        final String username = jwtService.extractUsername(jwt);

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
            if (jwtService.isTokenValid(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        filterChain.doFilter(request, response);
    }
}
```

---

## 6. Configuración Central de Seguridad (`SecurityConfiguration`)

Aquí definimos qué rutas son públicas y cuáles requieren autenticación:

```java
package com.mockengine.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity // Permite usar anotaciones @PreAuthorize en controladores
@RequiredArgsConstructor
public class SecurityConfiguration {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final CustomUserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Rutas públicas:
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/mock/**").permitAll() // El motor de mocks responde públicamente
                .requestMatchers("/actuator/**", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                // Rutas que requieren autenticación:
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
```

---

## 7. Capa de Autenticación: DTOs, Servicio y Controlador

Para completar el flujo de autenticación, implementamos los objetos de transferencia de datos (DTOs), el servicio de negocio (`AuthService`) y el controlador REST (`AuthController`).

### 7.1. Objetos de Transferencia de Datos (DTOs)

Creamos los DTOs en el paquete `com.mockengine.dto.auth`:

#### `RegisterRequest.java`
```java
package com.mockengine.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "El nombre de usuario no puede estar en blanco")
    @Size(min = 3, max = 50, message = "El nombre de usuario debe tener entre 3 y 50 caracteres")
    private String username;

    @NotBlank(message = "La contraseña no puede estar en blanco")
    @Size(min = 6, max = 100, message = "La contraseña debe tener al menos 6 caracteres")
    private String password;
}
```

#### `LoginRequest.java`
```java
package com.mockengine.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "El nombre de usuario no puede estar en blanco")
    private String username;

    @NotBlank(message = "La contraseña no puede estar en blanco")
    private String password;
}
```

#### `AuthResponse.java`
```java
package com.mockengine.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;

    @Builder.Default
    private String type = "Bearer";

    private String username;

    private String role;

    private long expiresInMs;
}
```

---

### 7.2. Servicio de Autenticación (`AuthService`)

Encapsula la lógica de hashing de contraseñas, validación de unicidad, invocación al `AuthenticationManager` y emisión de tokens:

```java
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
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado tras autenticación: " + request.getUsername()));

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
}
```

---

### 7.3. Controlador REST (`AuthController`)

Expone los endpoints públicos definidos en `SecurityConfiguration`:

```java
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
}
```

---

¡Avanza al **[Módulo 10: Control de Acceso (RBAC) y Modo Invitado](./10-rbac-multi-tenancy-guest-mode.md)** para implementar la segregación de recursos por usuario y el acceso anónimo efímero!
