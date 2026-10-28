package com.mockengine.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "scenario_states", uniqueConstraints = {
    @UniqueConstraint(name = "uk_user_state_name", columnNames = {"owner_username", "name"}),
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

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String name = "default"; // Nombre amigable: "carrito-lleno", "default"

    @Builder.Default
    @Column(name = "owner_username", nullable = false, length = 50)
    private String ownerUsername = "system"; // Usuario creador o "system" para el estado por defecto

    @Column(name = "session_key", nullable = false, length = 100)
    private String sessionKey; // Clave pública para cabecera X-Session-ID: "pedro:carrito-lleno"

    @Builder.Default
    @Column(name = "state_json", columnDefinition = "TEXT", nullable = false)
    private String stateJson = "{}"; // Payload de variables de estado JSON

    @Builder.Default
    @Column(name = "initial_state_json", columnDefinition = "TEXT")
    private String initialStateJson = "{}"; // Snapshot base guardado manualmente para restaurar con Reset

    @Builder.Default
    @Column(name = "is_system", nullable = false)
    private boolean system = false; // true para el estado "default" del sistema

    @Column(name = "last_accessed_at", nullable = false)
    private LocalDateTime lastAccessedAt;

    @PrePersist
    @PreUpdate
    protected void updateTimestamp() {
        this.lastAccessedAt = LocalDateTime.now();
    }
}
