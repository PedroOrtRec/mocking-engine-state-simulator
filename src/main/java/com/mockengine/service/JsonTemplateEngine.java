package com.mockengine.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class JsonTemplateEngine {

    private final ObjectMapper objectMapper;
    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\{\\{([a-zA-Z0-9_.]+)\\}\\}");

    /**
     * Procesa una plantilla JSON sustituyendo placeholders por valores dinámicos.
     */
    public String evaluateTemplate(
            String templateJson,
            Map<String, String> pathVariables,
            Map<String, Object> sessionState
    ) {
        if (templateJson == null || templateJson.isBlank()) {
            return "{}";
        }

        Matcher matcher = PLACEHOLDER_PATTERN.matcher(templateJson);
        StringBuilder sb = new StringBuilder();

        while (matcher.find()) {
            String key = matcher.group(1);
            String replacement = resolveValue(key, pathVariables, sessionState);
            // Escapar barras y signos de dólar para appendReplacement
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);

        return sb.toString();
    }

    private String resolveValue(String key, Map<String, String> pathVars, Map<String, Object> state) {
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

        return "{{" + key + "}}"; // Dejar intacto si no se reconoce
    }

    /**
     * Valida si un string es un JSON sintácticamente correcto.
     */
    public boolean isValidJson(String jsonString) {
        try {
            objectMapper.readTree(jsonString);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
