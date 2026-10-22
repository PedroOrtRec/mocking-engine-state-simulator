# Módulo 17: Autenticación, Gestión de Sesiones y Modo Invitado

En este módulo construirás el flujo de autenticación completo en el frontend, conectando la SPA con la API de seguridad desarrollada en la Fase 2 (Módulos 09 y 10).

---

## 🎯 Objetivos de Aprendizaje

1. Implementar la gestión de sesión de cliente con **Zustand** y persistencia en `localStorage`.
2. Crear formularios de **Login** y **Registro** con validación y manejo de errores RFC 7807.
3. Desarrollar la funcionalidad **1-Click Guest Access**: un botón que permite a reclutadores y usuarios probar el simulador al instante como invitado.
4. Proteger rutas en el cliente mediante un componente `ProtectedRoute` y aplicar renderizado condicional según el rol (`ROLE_USER` vs `ROLE_ADMIN`).

---

## 1. El Almacén de Sesión con Zustand (`use-auth-store.ts`)

En `frontend/src/stores/use-auth-store.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  username: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN' | 'ROLE_GUEST';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'mockengine-auth-storage',
    }
  )
);
```

---

## 2. Servicios de Autenticación (`auth-api.ts`)

En `frontend/src/features/auth/api/auth-api.ts`:

```typescript
import { apiClient } from '@/lib/api-client';
import { AuthUser } from '@/stores/use-auth-store';

export interface AuthResponse {
  token: string;
  username: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN' | 'ROLE_GUEST';
  expiresInMs: number;
}

export const authApi = {
  login: async (credentials: { username: string; password: string }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: { username: string; password: string }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', credentials);
    return response.data;
  },

  // Acceso instantáneo en 1-Click:
  guestLogin: async (): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/guest');
    return response.data;
  },
};
```

---

## 3. Página de Login con Acceso de Invitado (`LoginPage.tsx`)

En `frontend/src/features/auth/components/LoginPage.tsx`:

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';
import { authApi } from '../api/auth-api';
import { Sparkles, Lock, User, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.login({ username, password });
      login(data.token, { username: data.username, role: data.role });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Credenciales inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.guestLogin();
      login(data.token, { username: data.username, role: data.role });
      navigate('/dashboard');
    } catch (err: any) {
      setError('No se pudo generar la sesión de invitado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Mocking Engine Studio</h1>
          <p className="text-sm text-slate-400">Simulador dinámico de APIs y control de estados</p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300">Usuario</label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300">Contraseña</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 text-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-500">¿Solo quieres probar?</span>
          </div>
        </div>

        {/* Botón de acceso 1-Click como Invitado */}
        <button
          onClick={handleGuestAccess}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          Entrar como Invitado (Sandbox 24h)
        </button>
      </div>
    </div>
  );
}
```

---

## 4. Protección de Rutas (`ProtectedRoute.tsx`)

En `frontend/src/app/router.tsx`, envolvemos las rutas privadas:

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/use-auth-store';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

¡Avanza al **[Módulo 18: Mock Studio y Gestión de Endpoints](./18-gestion-endpoints-mock-studio.md)** para construir el panel interactivo de creación de mocks!
