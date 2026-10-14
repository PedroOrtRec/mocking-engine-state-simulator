# Módulo 02: Setup Inicial con Docker y PostgreSQL

En este módulo configurarás las bases del proyecto desde cero: el gestor de dependencias Maven, la base de datos PostgreSQL en contenedor Docker, y la clase principal de arranque en Java 21 con soporte para **Virtual Threads**.

---

## 1. Estructura de Directorios del Proyecto

El estándar de proyectos en Java con Maven sigue esta estructura (la misma que viste en `back_factinterna`):

```
mocking-engine-state-simulator/
├── docker-compose.yml
├── pom.xml
├── guide/
└── src/
    ├── main/
    │   ├── java/
    │   │   └── com/
    │   │       └── mockengine/
    │   │           └── MockEngineApplication.java
    │   └── resources/
    │       ├── application.yml
    │       └── application-dev.yml
    └── test/
        ├── java/
        └── resources/
            └── application-test.yml
```

---

## 2. Configurando el `pom.xml`

A diferencia de `back_factinterna` que heredaba de un `adquira-core` corporativo, aquí heredaremos directamente del padre oficial de Spring Boot: **`spring-boot-starter-parent`**.

Crea en la raíz del proyecto el archivo `pom.xml` con este contenido:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativePath/> <!-- busca en el repositorio central de Maven -->
    </parent>

    <groupId>com.mockengine</groupId>
    <artifactId>mocking-engine-state-simulator</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>mocking-engine-state-simulator</name>
    <description>Mocking Engine &amp; State Simulator for Frontend and Mobile teams</description>

    <properties>
        <java.version>21</java.version>
        <json-schema-validator.version>1.4.0</json-schema-validator.version>
    </properties>

    <dependencies>
        <!-- 1. Capa Web (Spring MVC + Jackson + Tomcat Embebido) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- 2. Capa de Persistencia (JPA + Hibernate + HikariCP) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>

        <!-- 3. Driver JDBC de PostgreSQL -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- 4. Validación de DTOs con anotaciones (@NotNull, @Min...) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- 5. Métricas, salud y observabilidad -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>

        <!-- 6. Lombok (Boilerplate reduction: getters, setters, constructores) -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- 7. Validador de JSON Schema (para verificar payloads móviles dinámicamente) -->
        <dependency>
            <groupId>com.networknt</groupId>
            <artifactId>json-schema-validator</artifactId>
            <version>${json-schema-validator.version}</version>
        </dependency>

        <!-- 8. Testing con JUnit 5 y Testcontainers -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-testcontainers</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Plugin oficial de Spring Boot para empaquetar un JAR autocontenido ejecutable -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

---

## 3. Base de Datos Local con Docker Compose

Para evitar instalar PostgreSQL directamente en tu máquina host y asegurar que cualquier compañero de equipo pueda ejecutar el entorno en un comando, definimos un `docker-compose.yml` en la raíz:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: mockengine-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: mockengine
      POSTGRES_USER: mockuser
      POSTGRES_PASSWORD: mocksecret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mockuser -d mockengine"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Comandos Docker indispensables:
- **Iniciar la BD en segundo plano:** `docker compose up -d`
- **Verificar que esté sana (healthy):** `docker compose ps`
- **Inspeccionar los logs de la BD:** `docker compose logs -f postgres`
- **Detener el contenedor:** `docker compose down`

---

## 4. Configuración de Spring Boot: `application.yml`

Spring Boot permite configurar la aplicación tanto con `application.properties` como con el formato jerárquico `application.yml`. En proyectos modernos se suele preferir YAML por su claridad visual.

Crea el archivo `src/main/resources/application.yml`:

```yaml
spring:
  application:
    name: mocking-engine-state-simulator

  # Habilitación de Virtual Threads de Java 21 (Project Loom)
  # Permite pausar peticiones de forma asíncrona sin bloquear el hilo del SO
  threads:
    virtual:
      enabled: true

  # Configuración del DataSource (PostgreSQL)
  datasource:
    url: jdbc:postgresql://localhost:5432/mockengine
    username: mockuser
    password: mocksecret
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 20000

  # Configuración de JPA / Hibernate
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    hibernate:
      # 'update' para desarrollo inicial: crea/actualiza tablas automáticamente
      # En producción corporativa se suele usar 'validate' con Flyway/Liquibase
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        format_sql: true

# Configuración de Actuator para comprobar la salud del servicio
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always

# Configuración de Logs (Similar al log4j2 visto en back_factinterna)
logging:
  level:
    com.mockengine: DEBUG
    org.springframework.web: INFO
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

> [!TIP]
> **¿Por qué `spring.threads.virtual.enabled: true`?**
> En Spring Boot 3.2+, activar esta propiedad hace que Tomcat asigne un **hilo virtual (Virtual Thread)** de Java 21 a cada petición HTTP entrante. Para nuestro simulador de latencia móvil (donde pausaremos respuestas 1 o 2 segundos), esto significa que podemos manejar miles de peticiones simultáneas consumiendo un puñado de megabytes de RAM, sin agotar el pool de hilos de Tomcat.

---

## 5. El Entry Point: `MockEngineApplication.java`

Crea el archivo `src/main/java/com/mockengine/MockEngineApplication.java`:

```java
package com.mockengine;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MockEngineApplication {

    public static void main(String[] args) {
        SpringApplication.run(MockEngineApplication.class, args);
    }
}
```

---

## 6. Verificación del Setup

Una vez que hayas creado estos archivos:

1. **Inicia PostgreSQL:**
   ```bash
   docker compose up -d
   ```
2. **Compila y descarga dependencias:**
   ```bash
   mvn clean compile
   ```
3. **Arranca la aplicación:**
   ```bash
   mvn spring-boot:run
   ```
4. **Verifica la salud en tu navegador o terminal:**
   ```bash
   curl http://localhost:8080/actuator/health
   ```
   Deberías recibir una respuesta JSON:
   ```json
   {
     "status": "UP",
     "components": {
       "db": {
         "status": "UP",
         "details": {
           "database": "PostgreSQL",
           "validationQuery": "isValid()"
         }
       },
       "diskSpace": {
         "status": "UP"
       },
       "ping": {
         "status": "UP"
       }
     }
   }
   ```

Si ves `"status": "UP"`, significa que Spring Boot ha conectado con éxito a PostgreSQL en Docker y el contexto está listo.

Siguiente paso: **[Módulo 03: Persistencia JPA y PostgreSQL](./03-persistencia-jpa-postgresql.md)**.
