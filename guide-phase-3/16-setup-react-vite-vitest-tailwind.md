# Módulo 16: Setup de React 19, Vite, Vitest y Tailwind CSS v4

En este módulo inicializarás la aplicación cliente en la carpeta `frontend/`, configurando las librerías modernas de la industria y estableciendo una **arquitectura basada en características (*Feature-Based Architecture*)**.

---

## 🎯 Objetivos de Aprendizaje

1. Inicializar un proyecto frontend moderno con **Vite 6**, **React 19** y **TypeScript**.
2. Configurar **Tailwind CSS v4**, la versión moderna de alto rendimiento que elimina la necesidad de `tailwind.config.js`.
3. Configurar **Vitest** y **React Testing Library** para pruebas unitarias ultrarrápidas en el mismo entorno que Vite.
4. Diseñar la jerarquía de carpetas siguiendo el estándar de dominio (*Feature-Driven*).

---

## 1. Inicialización del Proyecto

Desde la raíz del repositorio, ejecutamos:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
```

### Instalación de dependencias esenciales:

```bash
# Navegación, cliente HTTP y gestión de estado:
npm install react-router-dom axios @tanstack/react-query zustand lucide-react clsx tailwind-merge

# Dependencias de desarrollo y testing:
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

---

## 2. Configuración de Tailwind CSS v4 con Vite

En **Tailwind CSS v4**, la integración con Vite se realiza mediante su plugin oficial `@tailwindcss/vite`:

### En `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

### En `frontend/src/index.css`:

En Tailwind v4 solo necesitas una línea para importar todo el framework:

```css
@import "tailwindcss";

@layer base {
  body {
    @apply bg-slate-950 text-slate-100 antialiased font-sans;
  }
}
```

---

## 3. Arquitectura de Directorios (Feature-Based)

Organizamos el código agrupado por **dominio de negocio** en lugar de por tipo técnico genérico:

```text
frontend/src/
├── app/                       # Inicialización, enrutador y proveedores globales
│   ├── App.tsx
│   ├── providers.tsx          # QueryClientProvider, RouterProvider
│   └── router.tsx             # Definición de rutas públicas y protegidas
├── components/                # Componentes UI transversales sin lógica de negocio
│   └── ui/                    # Button, Input, Modal, Badge, Card
├── features/                  # Módulos encapsulados por funcionalidad de dominio
│   ├── auth/                  # Login, Registro, Modo Invitado
│   ├── endpoints/             # Mock Studio (CRUD de endpoints, editor JSON)
│   ├── chaos/                 # Controles de latencia y simulación de red
│   └── audit-logs/            # Monitor de logs en tiempo real
├── lib/                       # Instancias preconfiguradas
│   ├── api-client.ts          # Instancia Axios con interceptores JWT
│   └── query-client.ts        # TanStack Query Client
├── stores/                    # Estado global de cliente con Zustand
│   └── use-auth-store.ts      # Token JWT, usuario activo, sesión actual
├── test/                      # Configuración de Vitest
│   └── setup.ts
└── types/                     # Interfaces compartidas de la API
```

---

## 4. Configuración del Cliente HTTP Base (`api-client.ts`)

En `frontend/src/lib/api-client.ts`, creamos el cliente Axios preconfigurado con la URL base del backend:

```typescript
import axios from 'axios';
import { useAuthStore } from '@/stores/use-auth-store';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar automáticamente el token JWT en cada petición:
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 5. Configuración del Entorno de Pruebas (`setup.ts`)

En `frontend/src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

Y en `frontend/package.json` añadimos el script de testing:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run"
}
```

¡Avanza al **[Módulo 17: Autenticación, Gestión de Sesiones y Modo Invitado](./17-auth-session-guest-frontend.md)** para construir el flujo de login y acceso en un clic!
