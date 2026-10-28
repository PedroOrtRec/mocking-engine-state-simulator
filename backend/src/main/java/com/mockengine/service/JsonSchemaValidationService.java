package com.mockengine.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class JsonSchemaValidationService {

    private final ObjectMapper objectMapper;
    private final JsonSchemaFactory schemaFactory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);

    private static final Set<String> SCHEMA_ROOT_TYPES =
            Set.of("object", "array", "string", "number", "integer", "boolean");

    /**
     * Valida que la definición de requestSchema sea un JSON Schema Draft-07 estructuralmente válido
     * y no un JSON de ejemplo plano. Lanza IllegalArgumentException si no cumple.
     */
    public void assertValidSchemaDefinition(String schemaJson) {
        if (schemaJson == null || schemaJson.isBlank()) {
            return;
        }
        final JsonNode schemaNode;
        try {
            schemaNode = objectMapper.readTree(schemaJson);
        } catch (Exception e) {
            throw new IllegalArgumentException("El esquema de validación debe ser un JSON sintácticamente válido");
        }
        if (!isJsonSchemaDefinition(schemaNode)) {
            throw new IllegalArgumentException(
                    "El campo requestSchema debe ser un JSON Schema de validación válido (ej. {\"type\": \"object\", \"properties\": {...}}), no un JSON plano"
            );
        }
        try {
            schemaFactory.getSchema(schemaNode);
        } catch (Exception e) {
            throw new IllegalArgumentException("Definición de JSON Schema inválida: " + e.getMessage());
        }
    }

    /**
     * Valida el payload recibido contra el esquema JSON definido.
     * Retorna lista de errores de validación, o lista vacía si es válido.
     */
    public List<String> validatePayload(String schemaJson, String requestBody) {
        if (schemaJson == null || schemaJson.isBlank()) {
            return List.of(); // Sin validación requerida
        }

        try {
            JsonNode schemaNode = objectMapper.readTree(schemaJson);
            if (!isJsonSchemaDefinition(schemaNode)) {
                return List.of("El endpoint tiene un requestSchema inválido (no es un JSON Schema Draft-07)");
            }

            JsonSchema schema = schemaFactory.getSchema(schemaNode);
            JsonNode bodyNode = (requestBody == null || requestBody.isBlank()) 
                    ? objectMapper.createObjectNode() 
                    : objectMapper.readTree(requestBody);

            Set<ValidationMessage> validationResult = schema.validate(bodyNode);

            return validationResult.stream()
                    .map(ValidationMessage::getMessage)
                    .toList();
        } catch (Exception e) {
            log.error("Error al validar contra JSON Schema: {}", e.getMessage());
            return List.of("Error interno validando JSON Schema: " + e.getMessage());
        }
    }

    public boolean isJsonSchemaDefinition(JsonNode node) {
        if (node == null || !node.isObject()) {
            return false;
        }
        if (node.has("$schema")) {
            return true;
        }
        JsonNode typeNode = node.get("type");
        if (typeNode != null && typeNode.isTextual() && SCHEMA_ROOT_TYPES.contains(typeNode.asText())) {
            return node.has("properties") || node.has("required") || node.has("items") || node.has("additionalProperties");
        }
        return false;
    }
}
