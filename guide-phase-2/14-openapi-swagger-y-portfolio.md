# Módulo 14: Documentación Interactiva con OpenAPI / Swagger y Preparación de Portfolio

En este módulo final de la Fase 2 coronaremos el proyecto configurando **Springdoc OpenAPI 3 (Swagger UI)** con soporte para **autenticación Bearer JWT** y elaboraremos la estrategia para **destacar este proyecto ante reclutadores y líderes técnicos de empresas**.

---

## 🎯 Objetivos de Aprendizaje

1. Integrar `springdoc-openapi-starter-webmvc-ui` en Spring Boot 3.3+.
2. Configurar el esquema de seguridad global de OpenAPI para que Swagger UI incluya el botón **Authorize 🔓** y envíe automáticamente el encabezado `Authorization: Bearer <token>` en las llamadas interactivas.
3. Consolidar el entorno de desarrollo multi-servicio en `docker-compose.yml` (PostgreSQL + MongoDB + Redis).
4. Aprender a comunicar y defender las decisiones técnicas de este proyecto en una entrevista técnica de trabajo (*Storytelling de Ingeniería*).

---

## 1. Dependencia en `pom.xml`

```xml
<!-- Springdoc OpenAPI 3 con interfaz Swagger UI embebida -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.6.0</version>
</dependency>
```

---

## 2. Configuración de Swagger con Seguridad JWT (`OpenApiConfig`)

Creamos `com.mockengine.config.OpenApiConfig`:

```java
package com.mockengine.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "BearerAuth";

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Mocking Engine & State Simulator API")
                        .version("2.0.0")
                        .description("Motor dinámico de simulación de APIs, ingeniería de caos, aislamiento multitenant y persistencia políglota para equipos Frontend y Mobile.")
                        .contact(new Contact().name("Pedro Ortega")))
                // Registra el requisito de seguridad global
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Introduce tu token JWT obtenido en /api/v1/auth/login o /api/v1/auth/guest")));
    }
}
```

Al arrancar la aplicación, Swagger estará disponible en:
```text
http://localhost:8080/swagger-ui.html
```

---

## 3. Orquestación Multi-Servicio: `docker-compose.yml`

El archivo `docker-compose.yml` final de la Fase 2 levanta en un único comando toda la infraestructura requerida:

```yaml
version: '3.8'

services:
  # Base de Datos Relacional para Usuarios, MockEndpoints y Estados
  postgres:
    image: postgres:16-alpine
    container_name: mockengine-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: mockengine_db
      POSTGRES_USER: mockengine_user
      POSTGRES_PASSWORD: mockengine_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Base de Datos Documental NoSQL para Ingesta Masiva de Logs de Auditoría
  mongodb:
    image: mongo:7.0
    container_name: mockengine-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: mockengine_logs
    volumes:
      - mongo_data:/data/db

  # Almacenamiento en Memoria para Caché de Rutas y TTL de Sesiones Efímeras
  redis:
    image: redis:7.2-alpine
    container_name: mockengine-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  mongo_data:
  redis_data:
```

---

## 4. Guía para Enseñar este Proyecto a Reclutadores y Tech Leads

En una entrevista técnica, no te limites a decir *"hice un simulador de mocks"*. Comunica **el porqué de cada decisión técnica** siguiendo la estructura de impacto STAR (*Situación, Tarea, Acción, Resultado*):

### El *Elevator Pitch* (30 segundos):
> *"Desarrollé un Mocking Engine & State Simulator con Spring Boot 3.3 y Java 21 diseñado para desbloquear a equipos frontend y mobile cuando las APIs backend reales están en desarrollo o presentan latencias inestables.*
> *Implementé una arquitectura con **Persistencia Políglota** usando PostgreSQL para entidades transaccionales y MongoDB para logs masivos de auditoría, caché distribuida con Redis para resolución de rutas en sub-milisegundos, simulación de latencia 3G/4G con **Virtual Threads de Loom**, y seguridad stateless con **Spring Security 6 y JWT** con modo invitado efímero y tareas de purga programada."*

### Temas clave a destacar en la conversación técnica:

1. **Java 21 y Virtual Threads:** Explica cómo `Thread.sleep` o `ThreadLocalRandom` sobre hilos virtuales de Project Loom evitan saturar el pool de hilos de Tomcat al simular retardos de red prolongados.
2. **Persistencia Políglota (PostgreSQL vs MongoDB):** Argumenta por qué no metiste los logs en Postgres: para evitar el bloqueo del pool JDBC y aprovechar la flexibilidad natural de BSON para payloads JSON variables.
3. **Caché con Redis:** Explica el patrón Cache-Aside (`@Cacheable` y `@CacheEvict`) y cómo el TTL nativo de Redis alivia a la base de datos de limpiezas agresivas.
4. **Spring Security 6 moderno:** Menciona que no usaste configuraciones deprecadas, sino la `SecurityFilterChain` moderna, filtros `OncePerRequestFilter` y control granular `@PreAuthorize`.
5. **Testing con Testcontainers:** Explica que tus tests de integración no usan mocks en memoria de base de datos como H2, sino **contenedores Docker reales** de PostgreSQL y MongoDB orquestados con `@ServiceConnection`.

---

¡Felicidades! Con esta Fase 2 planificada y lista para implementar, dispones de una hoja de ruta técnica completa de nivel profesional para llevar tu conocimiento de Spring Boot y tu portfolio a un estándar de excelencia.
