package com.mockengine.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class JsonTemplateEngine {

    private final ObjectMapper objectMapper;
    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\{\\{([a-zA-Z0-9_.]+)\\}\\}");
    private static final Pattern QUOTED_VALUE_PLACEHOLDER_PATTERN =
            Pattern.compile("\"\\{\\{([a-zA-Z0-9_.]+)\\}\\}\"(?!\\s*:)");

    /**
     * Procesa una plantilla JSON sustituyendo placeholders por valores dinámicos (retrocompatible).
     */
    public String evaluateTemplate(
            String templateJson,
            Map<String, String> pathVariables,
            Map<String, Object> sessionState
    ) {
        return evaluateTemplate(templateJson, pathVariables, sessionState, null);
    }

    /**
     * Procesa una plantilla JSON sustituyendo placeholders por valores dinámicos incluyendo el request body.
     */
    public String evaluateTemplate(
            String templateJson,
            Map<String, String> pathVariables,
            Map<String, Object> sessionState,
            String requestBody
    ) {
        if (templateJson == null || templateJson.isBlank()) {
            return "{}";
        }

        JsonNode bodyNode = parseBody(requestBody);

        // 1. Primera pasada: Si un placeholder ocupa todo un string JSON ("{{...}}") y su valor original
        // en body o state es un tipo nativo no textual (número, booleano, objeto o lista), preservar el tipo JSON sin comillas.
        Matcher quotedMatcher = QUOTED_VALUE_PLACEHOLDER_PATTERN.matcher(templateJson);
        StringBuilder quotedSb = new StringBuilder();
        while (quotedMatcher.find()) {
            String key = quotedMatcher.group(1);
            Optional<String> rawJsonLiteral = resolveTypedJsonLiteral(key, sessionState, bodyNode);
            if (rawJsonLiteral.isPresent()) {
                quotedMatcher.appendReplacement(quotedSb, Matcher.quoteReplacement(rawJsonLiteral.get()));
            } else {
                quotedMatcher.appendReplacement(quotedSb, Matcher.quoteReplacement(quotedMatcher.group(0)));
            }
        }
        quotedMatcher.appendTail(quotedSb);

        // 2. Segunda pasada: Sustitución estándar de texto para el resto de placeholders
        Matcher matcher = PLACEHOLDER_PATTERN.matcher(quotedSb.toString());
        StringBuilder sb = new StringBuilder();

        while (matcher.find()) {
            String key = matcher.group(1);
            String replacement = resolveValue(key, pathVariables, sessionState, bodyNode);
            // Escapar barras y signos de dólar para appendReplacement
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);

        return sb.toString();
    }

    /**
     * Si el placeholder referencia un valor de estado o del body cuyo tipo nativo es
     * numérico, booleano, objeto o array, devuelve su representación literal JSON (sin comillas externas).
     */
    private Optional<String> resolveTypedJsonLiteral(
            String key,
            Map<String, Object> state,
            JsonNode bodyNode
    ) {
        if (key.startsWith("state.") && state != null) {
            String varName = key.substring("state.".length());
            Object val = state.get(varName);
            if (val instanceof Number || val instanceof Boolean) {
                return Optional.of(String.valueOf(val));
            }
            if (val instanceof Map<?, ?> || val instanceof Collection<?>) {
                try {
                    return Optional.of(objectMapper.writeValueAsString(val));
                } catch (Exception e) {
                    log.debug("No se pudo serializar objeto de estado {}: {}", varName, e.getMessage());
                }
            }
            return Optional.empty();
        }

        if (key.startsWith("body.") && bodyNode != null && !bodyNode.isNull() && !bodyNode.isMissingNode()) {
            JsonNode target = navigateBodyNode(bodyNode, key.substring("body.".length()));
            if (target != null && !target.isNull() && !target.isMissingNode()) {
                if (target.isNumber() || target.isBoolean() || target.isContainerNode()) {
                    return Optional.of(target.toString());
                }
            }
        }

        return Optional.empty();
    }

    private JsonNode navigateBodyNode(JsonNode bodyNode, String fieldPath) {
        String[] segments = fieldPath.split("\\.");
        JsonNode current = bodyNode;
        for (String segment : segments) {
            if (current == null) {
                return null;
            }
            current = current.get(segment);
        }
        return current;
    }

    private String resolveValue(
            String key,
            Map<String, String> pathVars,
            Map<String, Object> state,
            JsonNode bodyNode
    ) {
        // 1. Generadores globales
        if ("uuid".equalsIgnoreCase(key)) {
            return UUID.randomUUID().toString();
        }
        if ("now".equalsIgnoreCase(key)) {
            return Instant.now().toString();
        }
        if ("random.int".equalsIgnoreCase(key)) {
            return String.valueOf((int) (Math.random() * 1000));
        }

        // 2. Variables extraídas de la URI: {{path.id}}
        if (key.startsWith("path.") && pathVars != null) {
            String varName = key.substring("path.".length());
            return pathVars.getOrDefault(varName, "unknown");
        }

        // 3. Variables de estado de sesión: {{state.stock}}
        if (key.startsWith("state.") && state != null) {
            String varName = key.substring("state.".length());
            Object val = state.get(varName);
            return val != null ? String.valueOf(val) : "null";
        }

        // 4. Variables extraídas del cuerpo JSON de la petición: {{body.username}} o anidadas {{body.user.id}}
        if (key.startsWith("body.")) {
            if (bodyNode == null || bodyNode.isNull() || bodyNode.isMissingNode()) {
                return "null";
            }
            String fieldPath = key.substring("body.".length());
            String[] segments = fieldPath.split("\\.");
            JsonNode current = bodyNode;
            for (String segment : segments) {
                if (current == null) {
                    break;
                }
                current = current.get(segment);
            }
            if (current == null || current.isNull() || current.isMissingNode()) {
                return "null";
            }
            if (current.isValueNode()) {
                return current.asText();
            }
            return current.toString();
        }

        return "{{" + key + "}}"; // Dejar intacto si no se reconoce
    }

    private JsonNode parseBody(String requestBody) {
        if (requestBody == null || requestBody.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(requestBody);
        } catch (Exception e) {
            log.debug("Cuerpo de petición no es un JSON parseable: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Valida si un string es un JSON sintácticamente correcto.
     */
    public boolean isValidJson(String jsonString) {
        if (jsonString == null || jsonString.isBlank()) {
            return false;
        }
        try {
            JsonNode node = objectMapper.readTree(jsonString);
            return node != null && !node.isMissingNode();
        } catch (Exception e) {
            return false;
        }
    }
}
