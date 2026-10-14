# Módulo 03: Persistencia Relacional con JPA y PostgreSQL

En este módulo aprenderás a diseñar e implementar la capa de datos en Spring Boot utilizando **Spring Data JPA** y **Hibernate** sobre **PostgreSQL**.

---

## 1. Diseño del Modelo de Datos

Para que nuestro simulador sea potente y flexible, necesitamos modelar tres conceptos clave:

```
┌──────────────────────────────────────────────┐
│  MockEndpoint                                │
│  - Define la regla de mock registrada        │
│  - Método (GET, POST), Ruta (/users/{id})    │
│  - Código HTTP, Body (JSON), Latencia, Error │
└──────────────────────┬───────────────────────┘
                       │
                       │ Se audita cada llamada
                       ▼
┌──────────────────────────────────────────────┐
│  RequestAuditLog                             │
│  - Historial de llamadas realizadas          │
│  - Timestamp, Duración, Status, Body         │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  ScenarioState                               │
│  - Estado mutable de cada sesión/cliente     │
│  - sessionKey (X-Session-ID)                 │
│  - stateJson (Variables: stock, balance...)  │
└──────────────────────────────────────────────┘
```

---

## 2. Implementación de las Entidades JPA

Crea el paquete `com.mockengine.entity` y define las siguientes entidades:

### A. `MockEndpoint.java`

```java
package com.mockengine.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "mock_endpoints", indexes = {
    @Index(name = "idx_mock_method_path", columnList = "http_method, path_pattern")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MockEndpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name; // Ej: "Perfil de usuario VIP"

    @Column(name = "http_method", nullable = false, length = 10)
    private String httpMethod; // GET, POST, PUT, DELETE, PATCH

    @Column(name = "path_pattern", nullable = false, length = 255)
    private String pathPattern; // Ej: "/api/v1/users/{id}"

    @Builder.Default
    @Column(name = "status_code", nullable = false)
    private Integer statusCode = 200;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody; // JSON plantilla de respuesta

    @Column(name = "response_headers", columnDefinition = "TEXT")
    private String responseHeaders; // JSON con cabeceras custom

    @Builder.Default
    @Column(name = "delay_ms", nullable = false)
    private Long delayMs = 0L; // Latencia artificial (ms)

    @Builder.Default
    @Column(name = "error_rate", nullable = false)
    private Double errorRate = 0.0; // Probabilidad de fallo: 0.0 (0%) a 1.0 (100%)

    @Builder.Default
    @Column(name = "failure_status_code")
    private Integer failureStatusCode = 500;

    @Column(name = "request_schema", columnDefinition = "TEXT")
    private String requestSchema; // JSON Schema para validar la petición

    @Builder.Default
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
```

> [!NOTE]
> **Comparativa con `back_factinterna`:**
> Observa cómo en `Company.java` se utilizaban las anotaciones de Lombok `@Data`, `@NoArgsConstructor` y `@AllArgsConstructor`. Sin embargo, en entidades JPA complejas suele preferirse `@Getter` y `@Setter` (en vez de `@Data`), porque `@Data` genera `equals()`, `hashCode()` y `toString()` que pueden causar bucles infinitos en relaciones bidireccionales (`@OneToMany` / `@ManyToOne`).

### B. `ScenarioState.java`

Esta entidad almacena el estado reactivo que va acumulando un frontend o app móvil identificado por un ID de sesión (ej: cabecera `X-Session-ID`):

```java
package com.mockengine.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "scenario_states")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScenarioState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_key", nullable = false, unique = true, length = 100)
    private String sessionKey; // Identificador del dispositivo o cliente

    @Column(name = "state_json", columnDefinition = "TEXT", nullable = false)
    private String stateJson; // Ej: {"isLoggedIn": true, "stock": 4, "role": "ADMIN"}

    @Column(name = "last_accessed_at", nullable = false)
    private LocalDateTime lastAccessedAt;

    @PrePersist
    @PreUpdate
    protected void updateTimestamp() {
        this.lastAccessedAt = LocalDateTime.now();
    }
}
```

### C. `RequestAuditLog.java`

Para que los desarrolladores de frontend puedan inspeccionar exactamente qué cabeceras y body enviaron y qué respondió el simulador:

```java
package com.mockengine.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "request_audit_logs", indexes = {
    @Index(name = "idx_audit_session", columnList = "session_key"),
    @Index(name = "idx_audit_timestamp", columnList = "timestamp")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequestAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_key", length = 100)
    private String sessionKey;

    @Column(name = "http_method", nullable = false, length = 10)
    private String httpMethod;

    @Column(name = "request_uri", nullable = false, length = 500)
    private String requestUri;

    @Column(name = "status_code", nullable = false)
    private Integer statusCode;

    @Column(name = "duration_ms", nullable = false)
    private Long durationMs;

    @Column(name = "request_headers", columnDefinition = "TEXT")
    private String requestHeaders;

    @Column(name = "request_body", columnDefinition = "TEXT")
    private String requestBody;

    @Column(name = "response_body", columnDefinition = "TEXT")
    private String responseBody;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;
}
```

---

## 3. Repositorios de Spring Data JPA

Crea el paquete `com.mockengine.repository`. Al igual que vimos en `CompanyRepository.java` de `back_factinterna`, no necesitas implementar estas interfaces; Spring genera la implementación en tiempo de ejecución:

### `MockEndpointRepository.java`

```java
package com.mockengine.repository;

import com.mockengine.entity.MockEndpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MockEndpointRepository extends JpaRepository<MockEndpoint, Long> {

    // Devuelve todos los mocks activos para cargarlos o evaluarlos
    List<MockEndpoint> findByActiveTrue();

    // Busca un mock específico por método y ruta exacta
    Optional<MockEndpoint> findByHttpMethodAndPathPattern(String httpMethod, String pathPattern);

    // Permite listar los endpoints de un método HTTP concreto
    List<MockEndpoint> findByHttpMethod(String httpMethod);
}
```

### `ScenarioStateRepository.java`

```java
package com.mockengine.repository;

import com.mockengine.entity.ScenarioState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ScenarioStateRepository extends JpaRepository<ScenarioState, Long> {

    Optional<ScenarioState> findBySessionKey(String sessionKey);

    void deleteBySessionKey(String sessionKey);
}
```

### `RequestAuditLogRepository.java`

```java
package com.mockengine.repository;

import com.mockengine.entity.RequestAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RequestAuditLogRepository extends JpaRepository<RequestAuditLog, Long> {

    Page<RequestAuditLog> findBySessionKeyOrderByTimestampDesc(String sessionKey, Pageable pageable);

    Page<RequestAuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
}
```

---

## 4. DTOs: Separando el Modelo de Dominio de la API

Como vimos en `back_factinterna` con `CompanyDTO` frente a `Company`:
> **Nunca expongas las entidades JPA directamente en los controladores.**

Si devuelves la entidad directamente:
- Puedes exponer campos internos o sensibles.
- Los cambios en la tabla de la base de datos romperán a los clientes de tu API.
- Te arriesgas a problemas de serialización perezosa (`LazyInitializationException`).

Crea el paquete `com.mockengine.dto` con `MockEndpointDTO.java`:

```java
package com.mockengine.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MockEndpointDTO {

    private Long id;

    @NotBlank(message = "El nombre del endpoint no puede estar vacío")
    private String name;

    @NotBlank(message = "El método HTTP es obligatorio")
    @Pattern(regexp = "GET|POST|PUT|DELETE|PATCH", message = "Método HTTP no válido")
    private String httpMethod;

    @NotBlank(message = "La ruta patrón es obligatoria")
    private String pathPattern;

    @NotNull(message = "El código de estado es obligatorio")
    private Integer statusCode;

    private String responseBody;
    private String responseHeaders;
    private Long delayMs;
    private Double errorRate;
    private Integer failureStatusCode;
    private String requestSchema;
    private Boolean active;
}
```

Siguiente paso: **[Módulo 04: Motor de Enrutamiento Dinámico con Spring MVC](./04-motor-enrutamiento-dinamico.md)**.
