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

    /**
     * Valida el payload recibido contra el esquema JSON definido.
     * Retorna lista de errores de validación, o lista vacía si es válido.
     */
    public List<String> validatePayload(String schemaJson, String requestBody) {
        if (schemaJson == null || schemaJson.isBlank()) {
            return List.of(); // Sin validación requerida
        }

        try {
            JsonSchema schema = schemaFactory.getSchema(schemaJson);
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
}
