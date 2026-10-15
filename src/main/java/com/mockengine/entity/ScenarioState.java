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
