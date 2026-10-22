# Módulo 11: Persistencia Políglota con MongoDB

En este módulo implementarás el patrón de arquitectura empresarial **Persistencia Políglota (*Polyglot Persistence*)**, haciendo que dos bases de datos coexistan armónicamente en la misma aplicación Spring Boot:
* **PostgreSQL 16 (JPA / Hibernate):** Para entidades relacionales transaccionales (`User`, `MockEndpoint`, `ScenarioState`).
* **MongoDB 7.0 (Spring Data MongoDB):** Para la ingesta masiva y consulta de logs de auditoría semi-estructurados (`RequestAuditLogDocument`).

---

## 🎯 Objetivos de Aprendizaje

1. Comprender cuándo utilizar una base de datos relacional (ACID, integridad referencial) frente a una base de datos documental NoSQL (alta tasa de escritura *append-only*, esquema flexible BSON).
2. Configurar **Spring Boot para repositorios mixtos**: separar los paquetes de `@EnableJpaRepositories` y `@EnableMongoRepositories` evitando colisiones en el escaneo de beans.
3. Modelar colecciones documentales con anotaciones de Spring Data Mongo (`@Document`, `@Id`, `@Indexed`, `@Field`).
4. Utilizar **Testcontainers** para orquestar simultáneamente un contenedor PostgreSQL y un contenedor MongoDB en las pruebas de integración.

---

## 1. Justificación Arquitectónica: ¿Por qué extraer los logs a MongoDB?

En el Módulo 08 guardábamos los logs de peticiones en PostgreSQL. Aunque funcionaba, en entornos con miles de peticiones por segundo los logs generan:
1. **Fragmentación y bloqueo en PostgreSQL**: Los logs son transacciones constantes de inserción (*write-heavy*) que compiten por el pool de conexiones JDBC con las consultas críticas de matching de endpoints.
2. **Cuerpos variables de petición y respuesta**: En SQL, almacenar payloads JSON exige tipos `JSONB` o `TEXT`. En MongoDB, un log es de forma natural un documento BSON con capacidad de indexar subcampos dinámicos.
3. **Escalabilidad independiente**: MongoDB permite sharding y particionado horizontal por fecha o sesión sin afectar la base de datos relacional.

---

## 2. Dependencias en `pom.xml`

Añadimos el starter oficial de MongoDB y el soporte de Testcontainers:

```xml
<!-- Spring Data MongoDB Starter -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>

<!-- Testcontainers MongoDB para pruebas de integración -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>mongodb</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 3. Configuración Mixta (Separación de Repositorios)

Para que Spring no intente mapear entidades JPA como documentos Mongo (ni viceversa), organizamos los paquetes y configuramos la aplicación:

### Estructura de paquetes recomendada:
* `com.mockengine.repository.jpa`: Contiene `UserRepository`, `MockEndpointRepository`, etc.
* `com.mockengine.repository.mongo`: Contiene `RequestAuditLogMongoRepository`.

### Clase de configuración o clase principal:

```java
@Configuration
@EnableJpaRepositories(basePackages = "com.mockengine.repository.jpa")
@EntityScan(basePackages = "com.mockengine.entity")
public class JpaConfig {
}
```

```java
@Configuration
@EnableMongoRepositories(basePackages = "com.mockengine.repository.mongo")
public class MongoConfig {
}
```

---

## 4. Modelado del Documento (`RequestAuditLogDocument`)

Creamos el documento en `com.mockengine.document`:

```java
package com.mockengine.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.Map;

@Document(collection = "request_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequestAuditLogDocument {

    @Id
    private String id; // En MongoDB los identificadores son típicamente ObjectId de 24 caracteres hex

    @Indexed
    @Field("session_key")
    private String sessionKey;

    @Indexed
    @Field("owner_username")
    private String ownerUsername;

    @Field("http_method")
    private String httpMethod;

    @Field("request_uri")
    private String requestUri;

    @Field("status_code")
    private int statusCode;

    @Field("duration_ms")
    private long durationMs;

    @Field("request_headers")
    private Map<String, String> requestHeaders;

    @Field("request_body")
    private String requestBody;

    @Field("response_body")
    private String responseBody;

    @Indexed
    @Field("timestamp")
    @Builder.Default
    private Instant timestamp = Instant.now();
}
```

---

## 5. Repositorio Documental (`RequestAuditLogMongoRepository`)

```java
package com.mockengine.repository.mongo;

import com.mockengine.document.RequestAuditLogDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface RequestAuditLogMongoRepository extends MongoRepository<RequestAuditLogDocument, String> {

    // Búsqueda paginada por sesión
    Page<RequestAuditLogDocument> findBySessionKey(String sessionKey, Pageable pageable);

    // Búsqueda por propietario (para usuarios regulares)
    Page<RequestAuditLogDocument> findByOwnerUsername(String ownerUsername, Pageable pageable);

    // Logs recientes por código de error HTTP
    List<RequestAuditLogDocument> findByStatusCodeGreaterThanEqualAndTimestampAfter(int statusCode, Instant since);
}
```

---

## 6. Configuración de `docker-compose.yml`

Añadimos el servicio de MongoDB junto a PostgreSQL:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: mockengine-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: mockengine_db
      POSTGRES_USER: mockengine_user
      POSTGRES_PASSWORD: mockengine_password

  mongodb:
    image: mongo:7.0
    container_name: mockengine-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: mockengine_logs
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

Y en `application.yml`:

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/mockengine_logs
```

---

## 7. Test de Integración con Testcontainers Multi-Base de Datos

En Spring Boot 3.1+, `@ServiceConnection` funciona tanto para `PostgreSQLContainer` como para `MongoDBContainer`:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class PolyglotPersistenceIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    @ServiceConnection
    static MongoDBContainer mongo = new MongoDBContainer("mongo:7.0");

    @Autowired
    private RequestAuditLogMongoRepository mongoRepository;

    @Test
    void shouldPersistAuditLogInMongoContainer() {
        RequestAuditLogDocument doc = RequestAuditLogDocument.builder()
                .sessionKey("session_test")
                .httpMethod("GET")
                .requestUri("/mock/api/test")
                .statusCode(200)
                .build();

        mongoRepository.save(doc);

        assertThat(mongoRepository.findBySessionKey("session_test", Pageable.unpaged())).hasSize(1);
    }
}
```

¡Avanza al **[Módulo 12: Caché y TTL Automático con Redis](./12-cache-y-ttl-con-redis.md)** para incorporar almacenamiento ultrarrápido en memoria!
