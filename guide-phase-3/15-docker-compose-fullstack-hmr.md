# Módulo 15: Entorno Fullstack en Docker Compose con Hot Reload (HMR)

En este módulo construirás la infraestructura de desarrollo local unificada para la Fase 3, integrando en un único archivo `docker-compose.yml` todos los componentes del sistema:
* **3 Bases de Datos:** PostgreSQL (relacional), MongoDB (documentos de auditoría) y Redis (caché y sesiones efímeras).
* **Backend Spring Boot 3.3 (Java 21):** Montado en vivo con recarga automática.
* **Frontend React 19 (Vite 6):** Con **Hot Module Replacement (HMR)** y aislamiento estricto de dependencias en contenedor.

---

## 🎯 Objetivos de Aprendizaje

1. Configurar un entorno de desarrollo multi-servicio con **Docker Compose** donde un solo comando levanta toda la arquitectura.
2. Resolver el problema común de **HMR en Docker**: configurar Vite con `--host 0.0.0.0` y polling de archivos para reflejar cambios de código instantáneamente en el navegador.
3. Prevenir la colisión de `node_modules` entre la máquina anfitriona y el contenedor Linux mediante un **volumen anónimo**.
4. Implementar **Healthchecks** y condiciones de arranque (`service_healthy`) para asegurar que el backend no inicie hasta que las 3 bases de datos estén listas para recibir conexiones.

---

## 1. El Archivo `docker-compose.yml` Completo

En la raíz del proyecto, configuramos:

```yaml
version: '3.8'

services:
  # 1. Base de datos Relacional (PostgreSQL 16)
  postgres:
    image: postgres:16-alpine
    container_name: mockengine_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: mockengine_db
      POSTGRES_USER: mockengine_user
      POSTGRES_PASSWORD: mockengine_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mockengine_user -d mockengine_db"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - mockengine_net

  # 2. Base de datos NoSQL Documental (MongoDB 7.0)
  mongodb:
    image: mongo:7.0
    container_name: mockengine_mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: mockengine_logs
    volumes:
      - mongodata:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - mockengine_net

  # 3. Base de datos en Memoria y Caché (Redis 7.2)
  redis:
    image: redis:7.2-alpine
    container_name: mockengine_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - mockengine_net

  # 4. Backend (Spring Boot 3.3 con Java 21)
  backend:
    image: eclipse-temurin:21-jdk-alpine
    container_name: mockengine_backend
    working_dir: /app
    volumes:
      # Monta el código del backend en vivo:
      - .:/app
      # Cachea dependencias de Maven en el host para arranque instantáneo:
      - ~/.m2:/root/.m2
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/mockengine_db
      - SPRING_DATASOURCE_USERNAME=mockengine_user
      - SPRING_DATASOURCE_PASSWORD=mockengine_password
      - SPRING_DATA_MONGODB_URI=mongodb://mongodb:27017/mockengine_logs
      - SPRING_DATA_REDIS_HOST=redis
      - SPRING_DATA_REDIS_PORT=6379
      - SPRING_DEVTOOLS_RESTART_ENABLED=true
    command: ./mvnw spring-boot:run
    depends_on:
      postgres:
        condition: service_healthy
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - mockengine_net

  # 5. Frontend (React 19 + Vite 6)
  frontend:
    image: node:20-alpine
    container_name: mockengine_frontend
    working_dir: /app
    volumes:
      # Monta el código fuente del frontend:
      - ./frontend:/app
      # Volumen anónimo crucial: evita sobreescribir node_modules del contenedor con los del host:
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8080
      - CHOKIDAR_USEPOLLING=true # Asegura detección de cambios de archivos en sistemas macOS/Windows
    command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
    depends_on:
      - backend
    networks:
      - mockengine_net

volumes:
  pgdata:
  mongodata:
  redisdata:

networks:
  mockengine_net:
    driver: bridge
```

---

## 2. Puntos Clave de la Configuración de Vite para Docker

Para que el servidor de desarrollo de Vite funcione correctamente dentro de Docker y mantenga el **Hot Module Replacement (HMR)** conectado con el navegador:

1. **`--host 0.0.0.0`**: Por defecto Vite solo escucha en `localhost` (127.0.0.1) dentro del contenedor. El parámetro `--host 0.0.0.0` permite recibir conexiones desde fuera del contenedor (puerto 5173 del host).
2. **Volumen Anónimo `/app/node_modules`**: Si tienes dependencias instaladas en tu máquina local, montarlas directamente podría corromper binarios compilados para Alpine Linux. El volumen anónimo asegura que el contenedor mantenga sus propios módulos intactos.
3. **Configuración de `vite.config.ts`**:
   ```typescript
   export default defineConfig({
     server: {
       host: '0.0.0.0',
       port: 5173,
       watch: {
         usePolling: true, // Detección de cambios confiable entre sistemas de archivos anfitrión-contenedor
       },
     },
   });
   ```

---

## 3. Comandos Habituales de Operación

* **Levantar todo el stack en segundo plano:**
  ```bash
  docker compose up -d
  ```
* **Ver los logs de todos los servicios en streaming:**
  ```bash
  docker compose logs -f
  ```
* **Ver logs específicos del frontend o backend:**
  ```bash
  docker compose logs -f frontend
  docker compose logs -f backend
  ```
* **Detener todos los servicios preservando los datos de las BDs:**
  ```bash
  docker compose down
  ```

¡Avanza al **[Módulo 16: Setup de React 19, Vite, Vitest y Tailwind CSS v4](./16-setup-react-vite-vitest-tailwind.md)** para inicializar el proyecto frontend!
