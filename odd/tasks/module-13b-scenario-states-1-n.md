# Module 13b: Scenario State 1:N Management and Quotas
Goal: Refactor ScenarioState entity to 1:N with owner_username and name, enforce 5-state quota, reserved names, protect default state, and expose ScenarioStateAdminController
Branch: main
Delivery: Task-by-task with atomic commits
Test Runner: mvn test

## Specs
- S1: "Relación 1:N entre usuario y estados de escenario, cada usuario puede crear hasta un límite de 5, editar su nombre o borrarla."
- S2: "Mantener el estado por defecto ('default'), al que pueden entrar todos los usuarios, y el estado único de los invitados en Redis."
- S3: "Impedir que los usuarios creen un estado llamado 'guest' o 'default', o que empiece por 'guest_'."
- S4: "Namespacing para invocación en /mock/** con X-Session-ID (usuario:nombre)."

## Tasks
- [x] T1: Update ScenarioState entity and ScenarioStateRepository with ownerUsername, name, system flag, and unique constraints [S1, S2] -> commit: completed
- [x] T2: Create state DTOs (CreateStateRequest, UpdateStateRequest, ScenarioStateDTO) in com.mockengine.dto.state [S1] -> commit: completed
- [x] T3: Refactor StateManagementService to support 1:N states, 5-state quota, reserved names validation, and default state creation [S1, S2, S3, S4] -> commit: completed
- [x] T4: Create ScenarioStateAdminController under /api/v1/admin/states with RBAC [S1, S3] -> commit: completed
- [x] T5: Update unit tests (StateManagementServiceTest, ScenarioStateAdminControllerTest) [S1, S2, S3, S4] -> commit: completed

## Log
- L1: "Genial, primero, crea el módulo en la guide-2, y luego implementalo"
