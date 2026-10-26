package com.mockengine;

import com.mockengine.document.RequestAuditLogDocument;
import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.jpa.MockEndpointRepository;
import com.mockengine.repository.mongo.RequestAuditLogMongoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.Pageable;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

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
    private MockEndpointRepository jpaRepository;

    @Autowired
    private RequestAuditLogMongoRepository mongoRepository;

    @Test
    @DisplayName("Debe persistir en PostgreSQL y MongoDB simultáneamente en el mismo contexto Spring Boot")
    void shouldPersistInBothDatabasesSimultaneously() {
        // 1. Persistir en PostgreSQL (JPA)
        MockEndpoint endpoint = MockEndpoint.builder()
                .name("Polyglot Test Endpoint")
                .httpMethod("GET")
                .pathPattern("/api/polyglot")
                .statusCode(200)
                .ownerUsername("polyglot-user")
                .build();
        MockEndpoint savedEndpoint = jpaRepository.save(endpoint);
        assertThat(savedEndpoint.getId()).isNotNull();

        // 2. Persistir en MongoDB (Spring Data Mongo)
        RequestAuditLogDocument doc = RequestAuditLogDocument.builder()
                .sessionKey("polyglot_session")
                .ownerUsername("polyglot-user")
                .httpMethod("GET")
                .requestUri("/mock/api/polyglot")
                .statusCode(200)
                .build();
        RequestAuditLogDocument savedDoc = mongoRepository.save(doc);
        assertThat(savedDoc.getId()).isNotNull();

        // 3. Verificar consultas independientes en ambas bases de datos
        assertThat(jpaRepository.findByOwnerUsername("polyglot-user")).isNotEmpty();
        assertThat(mongoRepository.findByOwnerUsernameOrderByTimestampDesc("polyglot-user", Pageable.unpaged())).isNotEmpty();
    }
}
