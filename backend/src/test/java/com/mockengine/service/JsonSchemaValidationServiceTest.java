package com.mockengine.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JsonSchemaValidationServiceTest {

    private final JsonSchemaValidationService service = new JsonSchemaValidationService(new ObjectMapper());

    @Test
    @DisplayName("assertValidSchemaDefinition debe aceptar un JSON Schema Draft-07 válido")
    void assertValidSchemaDefinition_ValidSchema_Succeeds() {
        String validSchema = """
                {
                  "$schema": "http://json-schema.org/draft-07/schema#",
                  "type": "object",
                  "required": ["amount"],
                  "properties": {
                    "amount": { "type": "number", "minimum": 1 }
                  }
                }
                """;
        service.assertValidSchemaDefinition(validSchema);
    }

    @Test
    @DisplayName("assertValidSchemaDefinition debe rechazar un JSON plano que no sea JSON Schema")
    void assertValidSchemaDefinition_PlainJson_ThrowsIllegalArgumentException() {
        String plainJson = """
                {
                  "amount": 50,
                  "username": "pedro"
                }
                """;

        assertThatThrownBy(() -> service.assertValidSchemaDefinition(plainJson))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("debe ser un JSON Schema de validación válido");
    }

    @Test
    @DisplayName("validatePayload debe rechazar peticiones si requestSchema contiene un JSON plano en lugar de ignorarlo")
    void validatePayload_PlainJsonInSchema_ReturnsValidationError() {
        String plainJson = "{\"amount\": 50}";
        List<String> errors = service.validatePayload(plainJson, "{\"amount\": 50}");

        assertThat(errors).isNotEmpty();
        assertThat(errors.get(0)).contains("requestSchema inválido");
    }

    @Test
    @DisplayName("validatePayload debe validar restricciones avanzadas (minimum, pattern, enum, required)")
    void validatePayload_Constraints_EnforcedCorrectly() {
        String schema = """
                {
                  "type": "object",
                  "required": ["amount", "role"],
                  "properties": {
                    "amount": { "type": "number", "minimum": 10, "maximum": 100 },
                    "role": { "type": "string", "enum": ["USER", "ADMIN"] }
                  }
                }
                """;

        List<String> validErrors = service.validatePayload(schema, "{\"amount\": 50, \"role\": \"ADMIN\"}");
        assertThat(validErrors).isEmpty();

        List<String> invalidErrors = service.validatePayload(schema, "{\"amount\": 5, \"role\": \"GUEST\"}");
        assertThat(invalidErrors).hasSizeGreaterThanOrEqualTo(2);
    }
}
