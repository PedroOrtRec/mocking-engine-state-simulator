# Module 10: RBAC, Multi-Tenancy and Guest Mode
Goal: Implement Role-Based Access Control (@PreAuthorize), resource segregation in MockEndpoint, UserAdminController, and Guest Mode
Branch: main
Delivery: Task-by-task with atomic commits
Test Runner: mvn test

## Specs
- S1: "Dominar el uso de @PreAuthorize('hasRole(\"ADMIN\")') y expresiones SpEL (Spring Expression Language)."
- S2: "Segregar los datos: vincular cada MockEndpoint a su propietario (owner_username, is_ephemeral)."
- S3: "Diseñar la lógica de negocio multi-inquilino (ROLE_USER, ROLE_ADMIN)."
- S4: "Implementar el Modo Invitado (ROLE_GUEST): emisión de tokens temporales con prefijo guest_<UUID> en POST /api/v1/auth/guest."
- S5: "Explica solo las partes y líneas que sean una novedad en nuestro aprendizaje."

## Tasks
- [x] T1: Update MockEndpoint entity and MockEndpointRepository with owner_username and is_ephemeral [S2] -> commit: completed
- [x] T2: Add guest mode endpoint in AuthService and AuthController (POST /api/v1/auth/guest) [S4] -> commit: completed
- [x] T3: Create UserSummaryDTO, UserService, and UserAdminController with @PreAuthorize("hasRole('ADMIN')") [S1, S3] -> commit: completed
- [x] T4: Update MockEndpointAdminController with @PreAuthorize and ownership filtering logic [S1, S2, S3] -> commit: completed
- [x] T5: Update GlobalExceptionHandler to handle AccessDeniedException (403 Forbidden) [S1] -> commit: completed
- [x] T6: Add comprehensive unit tests for RBAC, UserAdminController, and Guest Mode [S1, S2, S3, S4] -> commit: completed

## Log
- L1: "El modulo 10 no tiene mayor complicación, impleméntalo y explíca solo las partes y líneas que sean una novedad en nuestro aprendizaje"
