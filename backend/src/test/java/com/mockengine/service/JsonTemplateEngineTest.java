package com.mockengine.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class JsonTemplateEngineTest {

    private JsonTemplateEngine engine;

    @BeforeEach
    void setUp() {
        engine = new JsonTemplateEngine(new ObjectMapper());
    }

    @Test
    @DisplayName("evaluateTemplate: evalúa placeholders globales, de ruta y de estado")
    void evaluateTemplate_GlobalAndPathAndState() {
        String template = "{\"id\": \"{{path.userId}}\", \"stock\": {{state.stock}}, \"token\": \"{{uuid}}\"}";
        Map<String, String> pathVars = Map.of("userId", "1234");
        Map<String, Object> state = Map.of("stock", 45);

        String result = engine.evaluateTemplate(template, pathVars, state);

        assertThat(result).contains("\"id\": \"1234\"");
        assertThat(result).contains("\"stock\": 45");
        assertThat(result).doesNotContain("{{uuid}}");
    }

    @Test
    @DisplayName("evaluateTemplate: evalúa placeholders desde requestBody simple y anidado")
    void evaluateTemplate_WithRequestBody() {
        String template = "{\"greeting\": \"Hola {{body.username}}\", \"role\": \"{{body.user.profile.role}}\", \"amount\": {{body.price}}}";
        String requestBody = "{\"username\": \"pedro\", \"price\": 99.95, \"user\": {\"profile\": {\"role\": \"ADMIN\"}}}";

        String result = engine.evaluateTemplate(template, Map.of(), Map.of(), requestBody);

        assertThat(result).isEqualTo("{\"greeting\": \"Hola pedro\", \"role\": \"ADMIN\", \"amount\": 99.95}");
    }

    @Test
    @DisplayName("evaluateTemplate: resuelve a null si el campo de body no existe o body es nulo")
    void evaluateTemplate_MissingBodyFieldOrNullBody() {
        String template = "{\"name\": \"{{body.nonExistent}}\"}";

        String resultWithNull = engine.evaluateTemplate(template, Map.of(), Map.of(), null);
        assertThat(resultWithNull).isEqualTo("{\"name\": \"null\"}");

        String resultWithEmpty = engine.evaluateTemplate(template, Map.of(), Map.of(), "{}");
        assertThat(resultWithEmpty).isEqualTo("{\"name\": \"null\"}");
    }

    @Test
    @DisplayName("isValidJson: valida sintaxis JSON correctamente")
    void isValidJson_Validation() {
        assertThat(engine.isValidJson("{\"ok\": true}")).isTrue();
        assertThat(engine.isValidJson("{invalid json}")).isFalse();
        assertThat(engine.isValidJson("")).isFalse();
    }
}
