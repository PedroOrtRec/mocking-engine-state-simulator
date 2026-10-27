package com.mockengine.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "mock_endpoints", indexes = {
    @Index(name = "idx_mock_method_path", columnList= "http_method, path_pattern")
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

  @Column(name = "state_updates", columnDefinition = "TEXT")
  private String stateUpdates; // Mutaciones de estado en formato JSON (Opción 2)

  @Builder.Default
  @Column(name = "active", nullable = false)
  private Boolean active = true;

  @Builder.Default
  @Column(name = "owner_username", nullable = false)
  private String ownerUsername = "system";

  @Builder.Default
  @Column(name = "is_ephemeral", nullable = false)
  private boolean ephemeral = false;

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
