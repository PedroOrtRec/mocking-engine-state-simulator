# Módulo 18: Mock Studio y Gestión Interactiva de Endpoints

En este módulo construirás el corazón del panel de control: el **Mock Studio**. Aquí los desarrolladores frontend y mobile pueden registrar, editar, activar/desactivar y probar endpoints simulados en tiempo real.

---

## 🎯 Objetivos de Aprendizaje

1. Implementar la sincronización de estado de servidor mediante **TanStack Query v5** (`useQuery` y `useMutation` con invalidación de caché).
2. Construir un **Editor Visual de Endpoints** con validación de sintaxis JSON en vivo.
3. Crear componentes interactivos: selector visual de verbos HTTP con badges de colores (GET verde, POST azul, DELETE rojo, etc.).
4. Añadir una utilidad de productividad: botón para **Copiar comando cURL** listo para ejecutar en consola.

---

## 1. Definición de Tipos y API con TanStack Query (`endpoints-api.ts`)

En `frontend/src/features/endpoints/api/endpoints-api.ts`:

```typescript
import { apiClient } from '@/lib/api-client';

export interface MockEndpoint {
  id: number;
  name: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  pathPattern: string;
  statusCode: number;
  responseBody: string;
  responseHeaders?: string;
  requestSchema?: string;
  delayMs?: number;
  errorRate?: number;
  active: boolean;
  ownerUsername: string;
}

export const endpointsApi = {
  getAll: async (): Promise<MockEndpoint[]> => {
    const res = await apiClient.get<MockEndpoint[]>('/api/v1/admin/endpoints');
    return res.data;
  },

  create: async (data: Omit<MockEndpoint, 'id' | 'ownerUsername'>): Promise<MockEndpoint> => {
    const res = await apiClient.post<MockEndpoint>('/api/v1/admin/endpoints', data);
    return res.data;
  },

  update: async (id: number, data: Omit<MockEndpoint, 'id' | 'ownerUsername'>): Promise<MockEndpoint> => {
    const res = await apiClient.put<MockEndpoint>(`/api/v1/admin/endpoints/${id}`, data);
    return res.data;
  },

  toggleActive: async (id: number): Promise<MockEndpoint> => {
    const res = await apiClient.patch<MockEndpoint>(`/api/v1/admin/endpoints/${id}/toggle`);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/endpoints/${id}`);
  },
};
```

---

## 2. Hooks de TanStack Query (`use-endpoints.ts`)

En `frontend/src/features/endpoints/hooks/use-endpoints.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpointsApi, MockEndpoint } from '../api/endpoints-api';

const QUERY_KEY = ['mockEndpoints'];

export function useEndpoints() {
  const queryClient = useQueryClient();

  const endpointsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: endpointsApi.getAll,
  });

  const toggleMutation = useMutation({
    mutationFn: endpointsApi.toggleActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: endpointsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    endpoints: endpointsQuery.data ?? [],
    isLoading: endpointsQuery.isLoading,
    toggleEndpoint: toggleMutation.mutate,
    deleteEndpoint: deleteMutation.mutate,
  };
}
```

---

## 3. Selector de Verbos HTTP con Badges de Color

En `frontend/src/features/endpoints/components/HttpMethodBadge.tsx`:

```tsx
interface Props {
  method: string;
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  POST: 'bg-blue-950 text-blue-400 border-blue-800',
  PUT: 'bg-amber-950 text-amber-400 border-amber-800',
  PATCH: 'bg-purple-950 text-purple-400 border-purple-800',
  DELETE: 'bg-rose-950 text-rose-400 border-rose-800',
};

export function HttpMethodBadge({ method }: Props) {
  const style = METHOD_STYLES[method.toUpperCase()] || 'bg-slate-800 text-slate-400 border-slate-700';
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${style}`}>
      {method.toUpperCase()}
    </span>
  );
}
```

---

## 4. Modal de Creación y Edición con Validación JSON

En `frontend/src/features/endpoints/components/EndpointFormModal.tsx`:

```tsx
import React, { useState } from 'react';
import { endpointsApi } from '../api/endpoints-api';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function EndpointFormModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState('');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [pathPattern, setPathPattern] = useState('/api/');
  const [statusCode, setStatusCode] = useState(200);
  const [responseBody, setResponseBody] = useState('{\n  "message": "success"\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const handleJsonChange = (val: string) => {
    setResponseBody(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (e: any) {
      setJsonError('JSON no válido: ' + e.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonError) return;

    await endpointsApi.create({
      name,
      httpMethod,
      pathPattern,
      statusCode,
      responseBody,
      active: true,
    });

    queryClient.invalidateQueries({ queryKey: ['mockEndpoints'] });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
        <h2 className="text-xl font-bold text-white">Registrar Mock Endpoint</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400">Método</label>
              <select
                value={httpMethod}
                onChange={(e: any) => setHttpMethod(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400">Patrón de Ruta</label>
              <input
                type="text"
                value={pathPattern}
                onChange={(e) => setPathPattern(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                placeholder="/api/v1/users/{id}"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-slate-400">Respuesta JSON</label>
              {jsonError && <span className="text-xs text-rose-400">{jsonError}</span>}
            </div>
            <textarea
              rows={8}
              value={responseBody}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-lg p-3 text-emerald-400 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!!jsonError}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm text-white font-medium rounded-lg"
            >
              Guardar Endpoint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

¡Avanza al **[Módulo 19: Panel de Control de Caos y Simulador de Estados](./19-chaos-control-state-dashboard.md)** para añadir controles visuales de latencia de red y máquinas de estados!
