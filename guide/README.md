# Guía de Aprendizaje: Mocking Engine & State Simulator con Spring Boot

Bienvenido al plan de aprendizaje paso a paso para dominar **Spring Boot 3 (Java 21)** desde cero, construyendo una herramienta real para desarrollo frontend y mobile: un **Mocking Engine & State Simulator**.

Esta guía está diseñada para que construyas el proyecto tú mismo, paso a paso, aprendiendo las entrañas de Spring Boot y contrastando cada decisión técnica con un proyecto empresarial real de referencia: **`dev/work/adquira/back_factinterna`**.

---

## 🎯 ¿Qué vamos a construir?

Una herramienta que permite a equipos frontend y mobile:
1. **Registrar endpoints dinámicos** vía REST API o interfaz web.
2. **Simular respuestas JSON dinámicas** basadas en plantillas y esquemas JSON.
3. **Simular latencia de red móvil real** (Fast 3G, Slow 3G, 4G, jitter aleatorio).
4. **Inyectar fallos controlados** (errores 500 intermitentes, timeouts, rate limits 429).
5. **Gestionar escenarios con estado** (ej: `/login` cambia el estado a autenticado; `/checkout` reduce stock de la sesión).
6. **Auditar peticiones** en una base de datos PostgreSQL mediante un registro de logs inspeccionable.

> [!NOTE]
> Para profundizar en los fundamentos formales, problemas técnicos y topologías de uso del simulador, consulta la documentación técnica en:
> * [01. Propósito, Problemática y Arquitectura de la Solución](../docs/01-proposito-y-problema-tecnico.md)
> * [02. Topologías de Despliegue y Escenarios de Uso](../docs/02-escenarios-de-uso-y-topologias.md)

---

## 🏗️ Mapa de Contenidos de la Guía

| Módulo | Archivo | Conceptos clave que aprenderás |
| :--- | :--- | :--- |
| **01** | [01-analisis-proyecto-referencia.md](./01-analisis-proyecto-referencia.md) | Análisis de `back_factinterna`: entry point, capas (Controller, Service, Repository, Entity, DTO, Mapper), configuración, testing. |
| **02** | [02-setup-inicial-docker-postgresql.md](./02-setup-inicial-docker-postgresql.md) | Creación del proyecto (Java 21, Spring Boot 3.3+, Maven), `docker-compose.yml` para PostgreSQL y configuración de `application.yml`. |
| **03** | [03-persistencia-jpa-postgresql.md](./03-persistencia-jpa-postgresql.md) | Spring Data JPA, Hibernate, modelado de entidades (`MockEndpoint`, `ScenarioState`, `RequestLog`), repositorios y DTOs. |
| **04** | [04-motor-enrutamiento-dinamico.md](./04-motor-enrutamiento-dinamico.md) | Ciclo de vida de Spring MVC, `DispatcherServlet`, captura de rutas dinámicas wildcard (`/mock/**`), resolución de path variables. |
| **05** | [05-manipulacion-dinamica-json-jackson.md](./05-manipulacion-dinamica-json-jackson.md) | Jackson avanzado: `ObjectMapper`, `JsonNode`, `ObjectNode`, interpolación dinámica de variables y validación con JSON Schema. |
| **06** | [06-latencia-concurrencia-hilos-virtuales.md](./06-latencia-concurrencia-hilos-virtuales.md) | Simulación de red 3G/4G, Java 21 Virtual Threads (Project Loom) vs `CompletableFuture`, inyección de caos y rate limiting. |
| **07** | [07-escenarios-con-estado.md](./07-escenarios-con-estado.md) | Máquinas de estados en memoria/Postgres, aislamiento por sesión (`X-Session-ID`), transiciones y respuestas condicionales. |
| **08** | [08-api-gestion-logs-y-testing.md](./08-api-gestion-logs-y-testing.md) | API REST de administración, `@RestControllerAdvice` con RFC 7807 (`ProblemDetail`), tests unitarios con Mockito y de integración con Testcontainers. |

---

## 🧭 Metodología de Estudio Recomendada

1. **Lee primero el módulo 01**: Entender cómo está estructurado `back_factinterna` te dará el mapa mental de un backend profesional en producción.
2. **Aplica un módulo a la vez**: Abre tu editor, crea los archivos Java correspondientes, compila con Maven (`./mvnw clean compile`) y prueba los endpoints con `curl` o Postman.
3. **Compara constantemente**: En cada guía verás bloques de comparación directa entre cómo lo hace `back_factinterna` y cómo lo implementaremos en `mocking-engine-state-simulator`.

¡Comienza con el **[Módulo 01: Análisis del Proyecto de Referencia](./01-analisis-proyecto-referencia.md)**!
