# Auth Controller and Service Implementation
Goal: Implement authentication DTOs, AuthService, AuthController, exception handlers, and tests for Spring Security 6 stateless JWT
Branch: main
Delivery: Task-by-task with atomic commits
Test Runner: mvn test

## Specs
- S1: "POST /api/v1/auth/register: Registro de nuevos usuarios con rol ROLE_USER."
- S2: "POST /api/v1/auth/login: Retorna el JWT si las credenciales coinciden."
- S3: "Genial, pues ahora avanza con el controlador y da una explicación línea por línea después"

## Tasks
- [x] T1: Create auth DTOs (RegisterRequest, LoginRequest, AuthResponse) [S1, S2] -> commit: completed
- [x] T2: Create AuthService with register and login logic [S1, S2] -> commit: completed
- [x] T3: Create AuthController exposing /api/v1/auth/register and /api/v1/auth/login [S1, S2, S3] -> commit: completed
- [x] T4: Update GlobalExceptionHandler for BadCredentialsException and IllegalArgumentException [S1, S2] -> commit: completed
- [x] T5: Add comprehensive unit tests (AuthServiceTest and AuthControllerTest) [S1, S2, S3] -> commit: completed
- [x] T6: Update guide-phase-2/09-seguridad-autenticacion-jwt.md with full code and explanation [S3] -> commit: completed

## Log
- L1: "Genial, pues ahora avanza con el controlador"
