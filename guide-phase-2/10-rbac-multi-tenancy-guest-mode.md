# Módulo 10: Control de Acceso (RBAC), Multi-Tenancy y Modo Invitado

En este módulo llevaremos la seguridad un paso más allá implementando **Control de Acceso Basado en Roles (RBAC)** y una arquitectura de **recursos segregados por usuario (*Multi-Tenancy lógico*)**, además de habilitar el **Modo Invitado (Guest Sandbox)**.

---

## 🎯 Objetivos de Aprendizaje

1. Dominar el uso de `@PreAuthorize("hasRole('ADMIN')")` y expresiones SpEL (*Spring Expression Language*).
2. Segregar los datos: vincular cada `MockEndpoint` a su propietario (`owner_id` o `owner_username`).
3. Diseñar la lógica de negocio multi-inquilino:
   * **Usuario Regular (`ROLE_USER`)**: Solo puede crear, listar, modificar y borrar sus propios mock endpoints y gestionar sus propios estados de sesión.
   * **Administrador (`ROLE_ADMIN`)**: Puede listar todos los usuarios registrados, consultar y activar/desactivar cualquier endpoint del sistema, y ver la auditoría de logs global.
4. Implementar el **Modo Invitado (`ROLE_GUEST`)**: emisión de tokens temporales con prefijo de sesión `guest_<UUID>` que permiten probar el simulador de forma inmediata.

---

## 1. Segregación de Recursos en `MockEndpoint`

Modificamos la entidad `MockEndpoint` para registrar el creador del endpoint y marcar si es efímero:

```java
// Nuevo campo en MockEndpoint.java:
@Column(name = "owner_username", nullable = false)
private String ownerUsername;

@Column(name = "is_ephemeral", nullable = false)
@Builder.Default
private boolean ephemeral = false;
```

Y en `MockEndpointRepository`:

```java
public interface MockEndpointRepository extends JpaRepository<MockEndpoint, Long> {

    // Para despachar en tiempo de ejecución:
    List<MockEndpoint> findByActiveTrue();

    // Para el panel del usuario regular:
    List<MockEndpoint> findByOwnerUsername(String ownerUsername);

    // Para tareas de limpieza de endpoints efímeros:
    List<MockEndpoint> findByEphemeralTrueAndCreatedAtBefore(Instant threshold);
}
```

---

## 2. Expresiones SpEL con `@PreAuthorize`

En Spring Security 6 podemos proteger métodos tanto a nivel de controlador como a nivel de servicio mediante la anotación `@PreAuthorize`.

### Ejemplo en el controlador administrativo:

```java
@RestController
@RequestMapping("/api/v1/admin/endpoints")
@RequiredArgsConstructor
public class MockEndpointAdminController {

    private final MockEndpointService mockEndpointService;

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN', 'GUEST')")
    public ResponseEntity<List<MockEndpointDTO>> listEndpoints(Authentication authentication) {
        String currentUsername = authentication.getName();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            // El administrador ve todos los endpoints de la plataforma
            return ResponseEntity.ok(mockEndpointService.findAll());
        } else {
            // Un usuario o invitado solo ve los suyos
            return ResponseEntity.ok(mockEndpointService.findByOwner(currentUsername));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Void> deleteEndpoint(@PathVariable Long id, Authentication authentication) {
        // El servicio valida que pertenezca al usuario o que sea admin
        mockEndpointService.deleteAuthorized(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
```

---

## 3. Panel de Administración de Usuarios (`UserAdminController`)

Este controlador queda protegido exclusivamente para el rol de administrador:

```java
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserAdminController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserSummaryDTO>> listAllUsers() {
        return ResponseEntity.ok(userService.findAllUsers());
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<Void> changeRole(@PathVariable Long userId, @RequestParam User.Role newRole) {
        userService.updateRole(userId, newRole);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long userId) {
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }
}
```

---

## 4. Modo Invitado (Guest Sandbox)

Para que los reclutadores o usuarios en un entorno sandbox puedan probar la herramienta sin registrarse con email/password, creamos el endpoint:

```http
POST /api/v1/auth/guest
```

### Implementación en `AuthService`:

```java
public AuthResponse generateGuestSession() {
    String guestId = "guest_" + UUID.randomUUID().toString().substring(0, 8);
    
    // Creamos un UserDetails virtual o efímero
    User guestUser = User.builder()
            .username(guestId)
            .password(passwordEncoder.encode(UUID.randomUUID().toString()))
            .role(User.Role.ROLE_GUEST)
            .build();
    
    userRepository.save(guestUser);

    String token = jwtService.generateToken(guestUser);

    return AuthResponse.builder()
            .token(token)
            .username(guestId)
            .role("ROLE_GUEST")
            .expiresInMs(86400000L) // 24 horas
            .build();
}
```

### Comportamiento del Modo Invitado:
* Todos los endpoints creados con este token se marcan automáticamente con `ephemeral = true`.
* La sesión por defecto para invocar mocks en `/mock/**` llevará la cabecera `X-Session-ID: guest_xxxxxxxx`.
* Se garantiza que el entorno compartido no se sature gracias al borrado programado que implementaremos en el **Módulo 13**.

¡Avanza al **[Módulo 11: Persistencia Políglota con MongoDB](./11-persistencia-poliglota-mongodb.md)** para desacoplar los logs de auditoría de la base de datos relacional!
