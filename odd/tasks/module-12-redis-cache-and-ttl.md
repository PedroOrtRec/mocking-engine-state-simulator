# Module 12: High-Performance Cache and TTL with Redis
Goal: Implement Spring Data Redis with Lettuce, RedisConfig (JSON serializer, CacheManager), @Cacheable/@CacheEvict on mock route matching, and EphemeralSessionRedisService with 24h TTL
Branch: main
Delivery: Task-by-task with atomic commits
Test Runner: mvn test

## Specs
- S1: "Configurar Spring Data Redis utilizando el cliente reactivo/asíncrono moderno Lettuce."
- S2: "Serialización en Redis: StringRedisSerializer para claves y GenericJackson2JsonRedisSerializer para valores JSON estructurados."
- S3: "Implementar el patrón Cache-Aside con @Cacheable y @CacheEvict ante mutaciones de endpoints."
- S4: "Almacenamiento de sesiones efímeras con TTL nativo de 24 horas en Redis para invitados (guest_*)."
- S5: "Después de realizar todas las implementaciones explícame línea a línea lo que hiciste."

## Tasks
- [x] T1: Add spring-boot-starter-data-redis and testcontainers-redis to pom.xml; update application.yml and docker-compose.yml [S1] -> commit: completed
- [x] T2: Create RedisConfig with CacheManager and RedisTemplate [S1, S2] -> commit: completed
- [x] T3: Add @Cacheable to MockRouteMatcherService and @CacheEvict to MockEndpointAdminController [S3] -> commit: completed
- [x] T4: Create EphemeralSessionRedisService and connect StateManagementService for guest_* sessions [S4] -> commit: completed
- [x] T5: Add comprehensive unit tests for EphemeralSessionRedisService and Redis cache eviction [S3, S4] -> commit: completed
- [x] T6: Provide exhaustive line-by-line pedagogical breakdown of every component created/modified [S5] -> commit: completed

## Log
- L1: "Avancemos con el módulo 12, este si me resulta más complejo, así que después de realizar todas las implementaciones explícame línea a línea lo que hiciste."
