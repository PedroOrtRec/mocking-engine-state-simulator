# Módulo 20: Monitor de Auditoría en Tiempo Real y Testing con Vitest

En este módulo final de la Fase 3 construirás el **Monitor de Logs de Auditoría en Tiempo Real** para inspeccionar las peticiones interceptadas por el motor y aprenderás a escribir pruebas unitarias y de integración de componentes con **Vitest**, **React Testing Library** y **Mock Service Worker (MSW v2)**.

---

## 🎯 Objetivos de Aprendizaje

1. Desarrollar un visor de auditoría en vivo con refresco automático (*polling* inteligente o *Server-Sent Events*) consumiendo los logs almacenados en MongoDB.
2. Implementar un drawer o modal deslizable para inspeccionar en detalle las cabeceras y payloads JSON de cada petición interceptada.
3. Configurar **Mock Service Worker (MSW v2)** para interceptar llamadas de red en los tests de componentes sin requerir que el backend esté encendido.
4. Escribir pruebas con **Vitest** y **React Testing Library** siguiendo las mejores prácticas de la industria.

---

## 1. Monitor de Auditoría (`AuditLogViewer.tsx`)

En `frontend/src/features/audit-logs/components/AuditLogViewer.tsx`:

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { HttpMethodBadge } from '@/features/endpoints/components/HttpMethodBadge';
import { Activity, Clock, Eye } from 'lucide-react';

interface AuditLog {
  id: string;
  httpMethod: string;
  requestUri: string;
  statusCode: number;
  durationMs: number;
  sessionKey: string;
  timestamp: string;
  requestBody?: string;
  responseBody?: string;
}

export function AuditLogViewer() {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Consulta los logs de MongoDB con refresco automático cada 3 segundos:
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const res = await apiClient.get<AuditLog[]>('/api/v1/admin/logs');
      return res.data;
    },
    refetchInterval: 3000,
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Monitor de Peticiones en Vivo (MongoDB)</h3>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Auto-refresco activo (3s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Método</th>
              <th className="py-2.5 px-3">Ruta</th>
              <th className="py-2.5 px-3">Estado</th>
              <th className="py-2.5 px-3">Duración</th>
              <th className="py-2.5 px-3">Sesión</th>
              <th className="py-2.5 px-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="py-2.5 px-3">
                  <HttpMethodBadge method={log.httpMethod} />
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-200">{log.requestUri}</td>
                <td className="py-2.5 px-3">
                  <span
                    className={`font-mono font-semibold ${
                      log.statusCode < 400
                        ? 'text-emerald-400'
                        : log.statusCode < 500
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {log.statusCode}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-mono flex items-center gap-1 text-slate-400">
                  <Clock className="h-3 w-3" />
                  {log.durationMs} ms
                </td>
                <td className="py-2.5 px-3 font-mono text-indigo-300">{log.sessionKey || 'default'}</td>
                <td className="py-2.5 px-3">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="p-1 hover:text-white transition-colors"
                    title="Inspeccionar Payload"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal visor de payload */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <h4 className="font-bold text-white">Detalle de la Petición</h4>
            <div className="space-y-2 text-xs">
              <span className="text-slate-400">Cuerpo de la Respuesta:</span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono overflow-x-auto max-h-60">
                {selectedLog.responseBody || '(Vacío)'}
              </pre>
            </div>
            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 2. Pruebas de Componentes con Vitest y React Testing Library

Escribimos un test para verificar que el formulario de login maneja correctamente las credenciales y el botón de acceso de invitado.

En `frontend/src/features/auth/components/LoginPage.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { authApi } from '../api/auth-api';

// Simular el módulo de la API de autenticación
vi.mock('../api/auth-api', () => ({
  authApi: {
    login: vi.fn(),
    guestLogin: vi.fn(),
  },
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar los campos de usuario, contraseña y botones', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar como invitado/i })).toBeInTheDocument();
  });

  it('debe invocar guestLogin al pulsar el botón de invitado', async () => {
    vi.mocked(authApi.guestLogin).mockResolvedValueOnce({
      token: 'fake-guest-jwt',
      username: 'guest_1234',
      role: 'ROLE_GUEST',
      expiresInMs: 86400000,
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const guestButton = screen.getByRole('button', { name: /entrar como invitado/i });
    fireEvent.click(guestButton);

    expect(authApi.guestLogin).toHaveBeenCalledTimes(1);
  });
});
```

---

## 3. Ejecución de la Suite de Tests Frontend

Para ejecutar la suite de pruebas con Vitest:

```bash
# Modo interactivo en caliente (TDD):
npm run test

# Modo ejecución única (para CI/CD):
npm run test:run
```

---

## 🚀 Conclusión del Proyecto Completo (Fullstack)

Al culminar las Fases 1, 2 y 3, tu repositorio contará con:
1. **Backend:** Java 21, Spring Boot 3.3+, Spring Security 6, JWT, Hilos Virtuales de Project Loom, Persistencia Políglota (PostgreSQL + MongoDB), Caché en Redis y Tareas Programadas `@Scheduled`.
2. **Frontend:** React 19, Vite 6, TypeScript, Tailwind CSS v4, TanStack Query v5, Zustand v5 y Vitest.
3. **DevOps & Despliegue:** `docker-compose.yml` multi-contenedor unificado con HMR y Testcontainers para PostgreSQL, MongoDB y Redis.

¡Una arquitectura lista para impresionar en cualquier proceso técnico de contratación!
