package com.mockengine.dto;

import jakarta.validation.constraints.*;
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
    @Size(max = 100, message = "El nombre no puede exceder los 100 caracteres")
    private String name;

    @NotBlank(message = "El método HTTP es obligatorio")
    @Pattern(regexp = "GET|POST|PUT|DELETE|PATCH", message = "Método HTTP no válido (debe ser GET, POST, PUT, DELETE o PATCH)")
    private String httpMethod;

    @NotBlank(message = "La ruta patrón es obligatoria")
    @Pattern(regexp = "^/.*", message = "La ruta patrón debe comenzar con '/'")
    private String pathPattern;

    @NotNull(message = "El código de estado es obligatorio")
    @Min(value = 100, message = "El código de estado HTTP debe ser mayor o igual a 100")
    @Max(value = 599, message = "El código de estado HTTP debe ser menor o igual a 599")
    private Integer statusCode;

    private String responseBody;
    private String responseHeaders;

    @PositiveOrZero(message = "La latencia simulada (delayMs) no puede ser negativa")
    private Long delayMs;

    @DecimalMin(value = "0.0", message = "La tasa de error (errorRate) no puede ser menor a 0.0 (0%)")
    @DecimalMax(value = "1.0", message = "La tasa de error (errorRate) no puede ser mayor a 1.0 (100%)")
    private Double errorRate;

    @Min(value = 100, message = "El código de estado de fallo debe ser válido (>= 100)")
    @Max(value = 599, message = "El código de estado de fallo debe ser válido (<= 599)")
    private Integer failureStatusCode;

    private String requestSchema;
    private String stateUpdates;
    private Boolean active;
}
