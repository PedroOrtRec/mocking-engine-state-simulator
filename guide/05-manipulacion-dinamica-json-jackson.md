# Módulo 05: Manipulación Dinámica de JSON con Jackson

En este módulo aprenderás a dominar **Jackson** más allá de los POJOs tradicionales. Aprenderás a trabajar con árboles de JSON dinámicos (`JsonNode`, `ObjectNode`), a interpolar variables en plantillas en tiempo real y a validar contratos mediante **JSON Schema**.

---

## 1. Jackson Tipado vs. Jackson Dinámico

En un backend clásico como `back_factinterna`, Jackson siempre mapea contra clases Java fijas:

```java
// Ejemplo convencional: Jackson necesita que exista CompanyDTO.java
CompanyDTO company = objectMapper.readValue(jsonString, CompanyDTO.class);
```

En nuestro **Mocking Engine**, no podemos crear una clase Java para cada endpoint inventado por el frontend. Necesitamos manipular el JSON de forma **dinámica y no estructurada** mediante el modelo de árbol de Jackson:

| Tipo Jackson | Representación en JSON | Uso principal |
| :--- | :--- | :--- |
| `JsonNode` | Nodo raíz o de solo lectura | Leer valores, navegar por el árbol (`.path("key")`) |
| `ObjectNode` | `{ "campo": "valor" }` | Crear o modificar propiedades de un objeto |
| `ArrayNode` | `[ 1, 2, "item" ]` | Crear o mutar listas de elementos |
| `ObjectMapper` | El motor central de Jackson | Serializar, parsear y convertir entre tipos |

---

## 2. Inyección y Uso de `ObjectMapper` en Spring Boot

Spring Boot configura automáticamente un bean de `ObjectMapper` listo para inyectar en cualquier servicio:

```java
@Service
@RequiredArgsConstructor
public class ExampleService {

    private final ObjectMapper objectMapper; // Inyectado automáticamente por Spring Boot

    public void parseDynamicJson(String json) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        
        // Navegación segura (si el campo no existe, path() no lanza NullPointerException)
        String userName = root.path("user").path("name").asText("Nombre por defecto");
        int age = root.path("user").path("age").asInt(18);
    }
}
```

---

## 3. Motor de Plantillas Dinámicas: `JsonTemplateEngine`

Los desarrolladores frontend a menudo necesitan que el mock devuelva valores dinámicos que dependan de la ruta (`{id}`), de generadores aleatorios (`uuid`, fechas actuales) o de variables de estado de la sesión.

Por ejemplo, un mock registrado en BD con este cuerpo:
```json
{
  "userId": "{{path.id}}",
  "generatedAt": "{{now}}",
  "transactionId": "{{uuid}}",
  "userStatus": "{{state.status}}",
  "availableStock": {{state.stock}}
}
```

Crea el archivo `com.mockengine.service.JsonTemplateEngine.java`:

```java
package com.mockengine.service;

import com.fasterxml.jackson.databind.JsonNode;
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
```

---

## 4. Validación de Contratos con JSON Schema

Muchos bugs en frontend/mobile ocurren cuando el cliente envía un payload con tipos incorrectos (ej: un string en lugar de un número en `userId`, o un campo obligatorio ausente).

Si el `MockEndpoint` registrado contiene un `requestSchema`, podemos validarlo antes de devolver la respuesta simulada usando la librería `com.networknt.schema`:

Crea el archivo `com.mockengine.service.JsonSchemaValidationService.java`:

```java
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
```

### Ejemplo de error devuelto al Frontend si la validación falla (HTTP 400):
```json
{
  "type": "https://mockengine.dev/errors/validation-failed",
  "title": "Violación de Contrato JSON Schema",
  "status": 400,
  "detail": "El cuerpo de la petición no cumple el esquema requerido",
  "errors": [
    "$.amount: must have a minimum value of 1.0",
    "$.currency: is required"
  ]
}
```

Siguiente paso: **[Módulo 06: Latencia de Red, Concurrencia e Hilos Virtuales](./06-latencia-concurrencia-hilos-virtuales.md)**.
