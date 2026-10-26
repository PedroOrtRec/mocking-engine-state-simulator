# Módulo 13b: Gestión Avanzada de Estados de Escenario (1:N, Namespacing y Cuota Máxima)

En este módulo refactorizaremos y ampliaremos el subsistema de **gestión de estados de escenario (*Scenario State Management*)** para superar la limitación de la relación 1:1, permitiendo que cada usuario autenticado gestione hasta **5 estados de prueba independientes**, preservando al mismo tiempo el estado global por defecto y el aislamiento efímero de los invitados.

---

## 🎯 Objetivos de Aprendizaje

1. Modelar una relación **1:N entre el usuario y sus estados de escenario** en JPA con restricciones compuestas de unicidad (`@UniqueConstraint`).
2. Diseñar una estrategia de **espacios de nombres (*Namespacing*)** para que el motor público `/mock/**` resuelva estados unívocamente mediante la cabecera `X-Session-ID: usuario:nombre-estado`.
3. Implementar reglas de negocio empresariales:
   * **Cuota máxima:** Límite estricto de **5 estados por usuario** para evitar saturación de la base de datos.
   * **Palabras reservadas:** Impedir la creación de estados con nombres reservados (`default`, `default-session`, `guest`, o prefijo `guest_`).
   * **Protección del estado del sistema:** Garantizar que el estado `default` sea inmutable ante intentos de borrado o renombrado.
4. Exponer una API REST administrativa completa (`ScenarioStateAdminController`) con RBAC y auditoría.
5. Mantener la coexistencia híbrida:
   * **Estado `default`:** Persistido en PostgreSQL, accesible por cualquier usuario si no se especifica sesión.
   * **Estados `guest_*`:** Gestionados exclusivamente en memoria **Redis con TTL de 24 horas**.
   * **Estados 1:N:** Persistidos en PostgreSQL bajo el espacio de nombres de cada usuario.

---

## 1. Justificación Arquitectónica: De Clave Plana a Relación 1:N

En la implementación inicial del Módulo 04, la entidad `ScenarioState` utilizaba una clave plana única `sessionKey`. Aunque funcionaba para pruebas aisladas, en una aplicación real un desarrollador necesita simular múltiples escenarios para un mismo flujo:

* Escenario 1: `"usuario-con-fondos"` (`{"saldo": 1500.0, "vip": true}`)
* Escenario 2: `"sin-saldo"` (`{"saldo": 0.0, "vip": false}`)
* Escenario 3: `"tarjeta-bloqueada"` (`{"bloqueada": true}`)

Vincular el estado directamente al nombre de usuario o requerir que compartan un único estado forzaba a resetear los datos continuamente.

---

## 2. Rediseño de la Entidad `ScenarioState`

Actualizamos `com.mockengine.entity.ScenarioState` para incorporar el nombre del estado, el propietario y la clave pública con namespace:

```java
package com.mockengine.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "scenario_states", uniqueConstraints = {
    // Un usuario no puede repetir el mismo nombre de estado
    @UniqueConstraint(name = "uk_user_state_name", columnNames = {"owner_username", "name"}),
    // La clave pública de invocación en X-Session-ID debe ser globalmente única
    @UniqueConstraint(name = "uk_session_key", columnNames = {"session_key"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScenarioState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name; // Nombre amigable: "carrito-lleno", "default"

    @Column(name = "owner_username", nullable = false, length = 50)
    private String ownerUsername; // Usuario creador o "system" para el estado por defecto

    @Column(name = "session_key", nullable = false, length = 100)
    private String sessionKey; // Clave pública para cabecera X-Session-ID: "pedro:carrito-lleno"

    @Column(name = "state_json", columnDefinition = "TEXT", nullable = false)
    private String stateJson; // Payload de variables de estado JSON

    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private boolean system = false; // true para el estado "default" protegido

    @Column(name = "last_accessed_at", nullable = false)
    private LocalDateTime lastAccessedAt;

    @PrePersist
    @PreUpdate
    protected void updateTimestamp() {
        this.lastAccessedAt = LocalDateTime.now();
    }
}
```

---

## 3. Repositorio JPA (`ScenarioStateRepository`)

Añadimos consultas para control de cuota y búsqueda segregada:

```java
package com.mockengine.repository.jpa;

import com.mockengine.entity.ScenarioState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScenarioStateRepository extends JpaRepository<ScenarioState, Long> {

    Optional<ScenarioState> findBySessionKey(String sessionKey);

    Optional<ScenarioState> findByOwnerUsernameAndName(String ownerUsername, String name);

    List<ScenarioState> findByOwnerUsername(String ownerUsername);

    long countByOwnerUsername(String ownerUsername);

    boolean existsByOwnerUsernameAndName(String ownerUsername, String name);

    void deleteBySessionKey(String sessionKey);
}
```

---

## 4. DTOs de Gestión de Estados

Creamos en `com.mockengine.dto.state`:

#### `CreateStateRequest.java`
```java
package com.mockengine.dto.state;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStateRequest {

    @NotBlank(message = "El nombre del estado es obligatorio")
    @Size(min = 2, max = 50, message = "El nombre debe tener entre 2 y 50 caracteres")
    @Pattern(regexp = "^[a-zA-Z0-9_-]+$", message = "El nombre solo puede contener letras, números, guiones y guiones bajos")
    private String name;

    @Builder.Default
    private String stateJson = "{}";
}
```

#### `UpdateStateRequest.java`
```java
package com.mockengine.dto.state;

import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStateRequest {

    @Size(min = 2, max = 50, message = "El nombre debe tener entre 2 y 50 caracteres")
    private String name;

    private String stateJson;
}
```

#### `ScenarioStateDTO.java`
```java
package com.mockengine.dto.state;

import com.mockengine.entity.ScenarioState;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioStateDTO {
    private Long id;
    private String name;
    private String ownerUsername;
    private String sessionKey;
    private String stateJson;
    private boolean system;
    private LocalDateTime lastAccessedAt;

    public static ScenarioStateDTO fromEntity(ScenarioState entity) {
        return ScenarioStateDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .ownerUsername(entity.getOwnerUsername())
                .sessionKey(entity.getSessionKey())
                .stateJson(entity.getStateJson())
                .system(entity.isSystem())
                .lastAccessedAt(entity.getLastAccessedAt())
                .build();
    }
}
```

---

## 5. Reglas de Negocio en `StateManagementService`

El servicio valida los nombres prohibidos, comprueba la cuota de 5 estados e implementa la resolución híbrida:

```java
// Palabras reservadas que un usuario no puede registrar:
private static final Set<String> RESERVED_NAMES = Set.of("default", "default-session", "guest");
public static final int MAX_STATES_PER_USER = 5;

public ScenarioStateDTO createState(CreateStateRequest request, String ownerUsername) {
    String stateName = request.getName().trim().toLowerCase();

    // 1. Validación de palabras reservadas
    if (RESERVED_NAMES.contains(stateName) || stateName.startsWith("guest_")) {
        throw new IllegalArgumentException("El nombre '" + stateName + "' está reservado por el sistema");
    }

    // 2. Control de cuota (máximo 5 estados)
    long currentCount = scenarioStateRepository.countByOwnerUsername(ownerUsername);
    if (currentCount >= MAX_STATES_PER_USER) {
        throw new IllegalStateException("Límite alcanzado: cada usuario puede crear un máximo de " + MAX_STATES_PER_USER + " estados");
    }

    // 3. Unicidad de nombre por usuario
    if (scenarioStateRepository.existsByOwnerUsernameAndName(ownerUsername, stateName)) {
        throw new IllegalArgumentException("Ya tienes un estado registrado con el nombre: " + stateName);
    }

    // 4. Construcción con namespace único
    String sessionKey = ownerUsername + ":" + stateName;
    ScenarioState state = ScenarioState.builder()
            .name(stateName)
            .ownerUsername(ownerUsername)
            .sessionKey(sessionKey)
            .stateJson(request.getStateJson() != null ? request.getStateJson() : "{}")
            .system(false)
            .build();

    return ScenarioStateDTO.fromEntity(scenarioStateRepository.save(state));
}
```

---

## 6. Controlador de Administración: `ScenarioStateAdminController`

Expone endpoints bajo `/api/v1/admin/states` protegidos con `@PreAuthorize("hasAnyRole('USER', 'ADMIN')")`:

* `GET /api/v1/admin/states`: Lista los estados del usuario autenticado junto al estado `default` global.
* `POST /api/v1/admin/states`: Crea un nuevo estado si no excede la cuota de 5.
* `PUT /api/v1/admin/states/{id}`: Actualiza nombre o JSON, verificando que no sea el estado del sistema.
* `DELETE /api/v1/admin/states/{id}`: Elimina el estado (bloqueado para `isSystem = true`).

---

## 7. Resolución en Tiempo de Ejecución en `/mock/**`

Al realizar una petición HTTP a `/mock/**`:
* Si `X-Session-ID` está vacío o es `"default"`, se utiliza el estado `default` del sistema.
* Si `X-Session-ID` comienza con `"guest_"`, se resuelve desde **Redis** con su TTL de 24h.
* Si `X-Session-ID` contiene el namespace `"usuario:estado"` (o una clave existente), se resuelve desde **PostgreSQL**.

---

¡Avanza al **[Módulo 14: Documentación Interactiva con OpenAPI / Swagger y Preparación de Portfolio](./14-openapi-swagger-y-portfolio.md)** para documentar toda la API con Swagger UI!
