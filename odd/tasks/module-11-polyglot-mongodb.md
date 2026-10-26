# Module 11: Polyglot Persistence with MongoDB
Goal: Implement Polyglot Persistence with PostgreSQL (JPA) and MongoDB (Spring Data MongoDB) for request audit logs, removing audit logs from PostgreSQL
Branch: main
Delivery: Task-by-task with atomic commits
Test Runner: mvn test

## Specs
- S1: "Separar los paquetes de @EnableJpaRepositories y @EnableMongoRepositories evitando colisiones en el escaneo de beans."
- S2: "Modelar colecciones documentales con anotaciones de Spring Data Mongo (@Document, @Id, @Indexed, @Field)."
- S3: "No te olvides de sacar los logs de postgresql si hiciera falta!"
- S4: "Actualizar AuditLogAdminController y MockExecutionService para usar MongoDB con segregación RBAC."
- S5: "Explica solo las novedades conceptuales y de sintaxis."

## Tasks
- [x] T1: Add spring-boot-starter-data-mongodb and testcontainers mongodb to pom.xml and update docker-compose.yml / application.yml [S1] -> commit: completed
- [x] T2: Remove RequestAuditLog JPA entity and repository from PostgreSQL; move existing JPA repositories to com.mockengine.repository.jpa [S1, S3] -> commit: completed
- [x] T3: Create RequestAuditLogDocument in com.mockengine.document and RequestAuditLogMongoRepository in com.mockengine.repository.mongo [S2] -> commit: completed
- [x] T4: Create JpaConfig and MongoConfig to cleanly separate repository scanning [S1] -> commit: completed
- [x] T5: Update MockExecutionService to persist audit logs into MongoDB [S3, S4] -> commit: completed
- [x] T6: Update AuditLogAdminController with MongoDB repository and RBAC segregation [S4] -> commit: completed
- [x] T7: Add comprehensive tests (AuditLogAdminControllerTest, MockExecutionServiceTest/PolyglotPersistenceIT) [S1, S2, S3, S4] -> commit: completed

## Log
- L1: "Vale, el módulo 11 también es sencillo, implementalo No te olvides de sacar los logs de postgresql si hiciera falta! Y explica aquí solo las novedades conceptuales y de sintaxis"
