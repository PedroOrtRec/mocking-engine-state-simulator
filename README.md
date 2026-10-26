# Mocking Engine & State Simulator

Motor dinámico de simulación de APIs HTTP, ingeniería de caos, persistencia políglota y emulación de estados para equipos de desarrollo Frontend y Mobile.

Construido sobre **Java 21**, **Spring Boot 3.3+**, **PostgreSQL**, **MongoDB**, **Redis**, **Virtual Threads (Project Loom)** y **Spring Security 6 con JWT**.

---

## 🚀 Inicio Rápido

### Requisitos Previos
* **Java 21** o superior instalado (`java -version`).
* **Maven 3.9+** (`mvn -v`).
* **Docker** y **Docker Compose** en ejecución.

### Ejecución en 3 Pasos

```bash
# 1. Iniciar la infraestructura multi-servicio (PostgreSQL, MongoDB y Redis)
docker compose up -d

# 2. Compilar el proyecto y ejecutar los tests
mvn test

# 3. Arrancar la aplicación
mvn spring-boot:run
```

### Verificación y Acceso

* **Salud del servicio y bases de datos:**
  ```bash
  curl http://localhost:8080/actuator/health
  ```
* **Documentación Interactiva Swagger UI (OpenAPI 3):**
  ```text
  http://localhost:8080/swagger-ui.html
  ```
  *(Incluye botón de autenticación Bearer JWT para probar endpoints protegidos interactivamente)*.

---

## 📚 Documentación Técnica de Arquitectura (`docs/`)

Especificaciones técnicas orientadas a diseño, integración y despliegue:
* **[Propósito, Problemática y Arquitectura de la Solución](docs/01-proposito-y-problema-tecnico.md):** Fundamentos de desacoplamiento, limitaciones de mocks estáticos frente a flujos con estado, y mecanismos de resolución dinámica y caos.
* **[Topologías de Despliegue y Escenarios de Uso](docs/02-escenarios-de-uso-y-topologias.md):** Análisis exhaustivo de los tres modos operativos (Localhost individual, Cloud Sandbox centralizado multitenant con `X-Session-ID`, y pipelines herméticos de CI/CD).

---

## 🛠️ Stack Tecnológico

* **Lenguaje:** Java 21 (LTS) con Virtual Threads de Project Loom.
* **Framework:** Spring Boot 3.3.4 (Spring MVC, Spring Data JPA, Spring Data MongoDB, Spring Data Redis, Spring Actuator, Spring Validation).
* **Seguridad:** Spring Security 6 (Stateless, `SecurityFilterChain`, JJWT 0.12.6, RBAC `@PreAuthorize`).
* **Persistencia Políglota:**
  * **PostgreSQL 16:** Datos relacionales transaccionales (`User`, `MockEndpoint`, `ScenarioState`).
  * **MongoDB 7.0:** Ingesta masiva no estructurada de logs de auditoría (`RequestAuditLogDocument`).
  * **Redis 7.2:** Caché de rutas (`@Cacheable` / `@CacheEvict`) y TTL nativo de 24 horas para sesiones efímeras de invitados.
* **Documentación de APIs:** Springdoc OpenAPI 3.0 (`springdoc-openapi-starter-webmvc-ui` 2.6.0).
* **Testing:** JUnit 5 Jupiter, Mockito, Testcontainers (PostgreSQL, MongoDB, Redis).
