# Mocking Engine & State Simulator

Motor dinámico de simulación de APIs HTTP, ingeniería de caos y emulación de estados para equipos de desarrollo Frontend y Mobile.

Construido sobre **Java 21**, **Spring Boot 3.3+**, **PostgreSQL** y **Virtual Threads (Project Loom)**.

---

## 🚀 Inicio Rápido

### Requisitos Previos
* **Java 21** o superior instalado (`java -version`).
* **Maven 3.9+** (`mvn -v`).
* **Docker** y **Docker Compose** en ejecución.

### Ejecución en 3 Pasos

```bash
# 1. Iniciar la base de datos PostgreSQL local
docker compose up -d

# 2. Compilar el proyecto
mvn clean compile

# 3. Arrancar la aplicación
mvn spring-boot:run
```

Verificar que el servicio y la conexión a base de datos están operativos:
```bash
curl http://localhost:8080/actuator/health
```

---

## 📚 Documentación Técnica de Arquitectura (`docs/`)

Especificaciones técnicas orientadas a diseño, integración y despliegue:
* **[Propósito, Problemática y Arquitectura de la Solución](docs/01-proposito-y-problema-tecnico.md):** Fundamentos de desacoplamiento, limitaciones de mocks estáticos frente a flujos con estado, y mecanismos de resolución dinámica y caos.
* **[Topologías de Despliegue y Escenarios de Uso](docs/02-escenarios-de-uso-y-topologias.md):** Análisis exhaustivo de los tres modos operativos (Localhost individual, Cloud Sandbox centralizado multitenant con `X-Session-ID`, y pipelines herméticos de CI/CD).

---

## 🛠️ Stack Tecnológico

* **Lenguaje:** Java 21 (LTS) con Hilos Virtuales habilitados.
* **Framework:** Spring Boot 3.3.4 (Spring MVC, Spring Data JPA, Spring Actuator, Spring Validation).
* **Persistencia:** PostgreSQL 16 (vía Docker) con HikariCP Connection Pool y Hibernate ORM.
* **Procesamiento JSON:** Jackson Databind y NetworkNT JSON Schema Validator.
* **Testing:** JUnit 5 Jupiter, Mockito, Testcontainers PostgreSQL.
