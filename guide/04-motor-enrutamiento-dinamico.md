# Módulo 04: Motor de Enrutamiento Dinámico con Spring MVC

En este módulo aprenderás cómo funciona el ciclo de vida de peticiones en Spring MVC y cómo implementar un **despachador dinámico (Dynamic Dispatcher)** capaz de resolver rutas registradas en base de datos en tiempo de ejecución.

---

## 1. El Enrutamiento Estático vs. Dinámico

En una aplicación convencional como `back_factinterna`, los endpoints se conocen en tiempo de compilación y se declaran estáticamente:

```java
// Ejemplo de back_factinterna (Ruta fija y compilada)
@GetMapping("/api/v1/companies/{id}")
public ResponseEntity<CompanyResponse> findCompanyById(@PathVariable Long id) { ... }
```

Sin embargo, en nuestro **Mocking Engine**:
1. Un compañero frontend registra en la BD la ruta `/api/v2/products/{productId}/stock` mediante la API de gestión.
2. Spring Boot no tiene ningún método Java con esa anotación en su código fuente.
3. El motor debe interceptar la petición, analizar la ruta recibida, extraer las variables (`productId = 123`) y resolver el mock correspondiente.

---

## 2. Cómo funciona Spring MVC por dentro

```
               Petición HTTP: GET /mock/api/v2/products/99/stock
                                      │
                                      ▼
                      ┌──────────────────────────────┐
                      │      DispatcherServlet       │
                      └──────────────┬───────────────┘
                                     │ Consulta qué handler mapea la ruta
                                     ▼
                      ┌──────────────────────────────┐
                      │    HandlerMapping (MVC)      │
                      └──────────────┬───────────────┘
                                     │ Encontrado: DynamicMockController
                                     ▼
                      ┌──────────────────────────────┐
                      │ DynamicMockDispatcherControl.│  <-- Intercepta /mock/**
                      └──────────────┬───────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
  ┌─────────────────────────────┐         ┌─────────────────────────────┐
  │  MockRouteMatcherService    │         │     MockExecutionService    │
  │  - AntPathMatcher           │         │  - Aplica latencia (3G/4G)  │
  │  - Extrae variables URI     │         │  - Evalúa JSON con Jackson  │
  │  - Busca en PostgreSQL     │         │  - Retorna ResponseEntity   │
  └─────────────────────────────┘         └─────────────────────────────┘
```

Spring Web utiliza el patrón **Front Controller** mediante `DispatcherServlet`. Para capturar todas las peticiones dinámicas sin romper los endpoints administrativos de la aplicación (como `/actuator` o nuestra futura `/api/admin`), utilizaremos el prefijo `/mock/**`.

---

## 3. Servicio de Resolución de Rutas: `MockRouteMatcherService`

Para resolver si `/mock/users/42` coincide con un patrón registrado como `/users/{id}`, utilizaremos **`AntPathMatcher`** de Spring (la misma clase que usa Spring internamente para resolver rutas).

Crea el paquete `com.mockengine.service` y el archivo `MockRouteMatcherService.java`:

```java
package com.mockengine.service;

import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.MockEndpointRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.AntPathMatcher;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MockRouteMatcherService {

    private final MockEndpointRepository mockEndpointRepository;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Getter
    @Builder
    public static class MatchResult {
        private final MockEndpoint endpoint;
        private final Map<String, String> pathVariables;
    }

    /**
     * Resuelve qué endpoint de base de datos coincide con el método HTTP y la ruta recibida.
     */
    public Optional<MatchResult> findMatch(String httpMethod, String subpath) {
        log.debug("Buscando mock para método: {} y subpath: {}", httpMethod, subpath);

        // 1. Obtenemos todos los mocks activos para el método HTTP indicado
        List<MockEndpoint> candidates = mockEndpointRepository.findByActiveTrue()
                .stream()
                .filter(m -> m.getHttpMethod().equalsIgnoreCase(httpMethod))
                .toList();

        // 2. Comprobación rápida: coincidencia exacta
        for (MockEndpoint candidate : candidates) {
            if (candidate.getPathPattern().equals(subpath)) {
                return Optional.of(MatchResult.builder()
                        .endpoint(candidate)
                        .pathVariables(Collections.emptyMap())
                        .build());
            }
        }

        // 3. Comprobación por patrones con variables: ej /users/{id}
        for (MockEndpoint candidate : candidates) {
            String pattern = candidate.getPathPattern();
            if (pathMatcher.match(pattern, subpath)) {
                Map<String, String> uriVariables = pathMatcher.extractUriTemplateVariables(pattern, subpath);
                log.debug("Match encontrado con patrón '{}'. Variables: {}", pattern, uriVariables);
                return Optional.of(MatchResult.builder()
                        .endpoint(candidate)
                        .pathVariables(uriVariables)
                        .build());
            }
        }

        log.warn("No se encontró ningún mock activo para [{} {}]", httpMethod, subpath);
        return Optional.empty();
    }
}
```

---

## 4. El Controlador Comodín: `DynamicMockDispatcherController`

Este controlador utiliza `@RequestMapping("/mock/**")` para interceptar cualquier verbo HTTP (`GET`, `POST`, `PUT`, `DELETE`, etc.) y cualquier subruta.

Crea el archivo `com.mockengine.controller.DynamicMockDispatcherController.java`:

```java
package com.mockengine.controller;

import com.mockengine.service.MockExecutionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mock")
@RequiredArgsConstructor
@Slf4j
public class DynamicMockDispatcherController {

    private final MockExecutionService mockExecutionService;

    /**
     * Intercepta cualquier método HTTP bajo la ruta /mock/**
     */
    @RequestMapping("/**")
    public ResponseEntity<?> handleMockRequest(
            HttpServletRequest request,
            @RequestBody(required = false) String requestBody
    ) {
        // 1. Extraemos la subruta relativa (ej: de "/mock/api/v1/users/42" obtenemos "/api/v1/users/42")
        String fullPath = request.getRequestURI();
        String subpath = fullPath.substring("/mock".length());
        if (subpath.isEmpty()) {
            subpath = "/";
        }

        String method = request.getMethod();
        log.info("Petición interceptada: [{} {}]", method, subpath);

        // 2. Delegamos la ejecución del mock al servicio orquestador
        return mockExecutionService.executeMock(method, subpath, request, requestBody);
    }
}
```

---

## 5. Conceptos clave aprendidos de Spring MVC

1. **`HttpServletRequest`**: Spring MVC te permite inyectar el objeto nativo de la Servlet API en cualquier parámetro de método de un `@RestController`. Con él puedes inspeccionar:
   - `request.getHeader("X-Session-ID")` para aislar estados.
   - `request.getParameterMap()` para leer query params (`?page=1&size=10`).
   - `request.getMethod()` y `request.getRequestURI()`.
2. **`@RequestBody(required = false)`**: Al definir `required = false`, el controlador puede recibir tanto peticiones sin body (`GET`, `DELETE`) como peticiones con payloads JSON complejos (`POST`, `PUT`).
3. **`AntPathMatcher`**: Esta utilidad oficial de Spring permite extraer cómodamente tokens entre llaves `{variable}` sin tener que escribir expresiones regulares complejas manualmente.

Siguiente paso: **[Módulo 05: Manipulación Dinámica de JSON con Jackson](./05-manipulacion-dinamica-json-jackson.md)**.
