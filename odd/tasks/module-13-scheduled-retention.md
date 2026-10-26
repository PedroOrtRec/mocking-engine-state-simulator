# Module 13: Scheduled Retention Tasks (@Scheduled)
Goal: Implement automated 24h retention cleanup for ephemeral mock endpoints using Spring @Scheduled and @CacheEvict
Branch: main
Delivery: Task-by-task with atomic commits
Test Runner: mvn test

## Specs
- S1: "Dominar el subsistema de tareas programadas de Spring: @EnableScheduling y la anotación @Scheduled con Cron UNIX."
- S2: "Diseñar transacciones de purga por lotes (deleteAllInBatch) eficientes en Spring Data JPA."
- S3: "Coordinar la purga de base de datos con la invalidación de la caché de Redis (@CacheEvict)."
- S4: "Explica solo las novedades una vez acabes."

## Tasks
- [x] T1: Create SchedulingConfig with @EnableScheduling [S1] -> commit: completed
- [x] T2: Create MockRetentionCleanupService with @Scheduled cron and @CacheEvict [S1, S2, S3] -> commit: completed
- [x] T3: Add comprehensive unit tests in MockRetentionCleanupServiceTest [S1, S2, S3] -> commit: completed
- [x] T4: Explain novelties clearly to user [S4] -> commit: completed

## Log
- L1: "Ahora vamos con el módulo 13, este es sencillo, explica solo las novedades una vez acabes"
