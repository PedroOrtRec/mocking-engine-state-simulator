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

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
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
            <div className="col-span-2">
              <label className="text-xs text-slate-400">Nombre descriptivo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                placeholder="Obtener perfil de usuario"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Código HTTP</label>
              <input
                type="number"
                value={statusCode}
                onChange={(e) => setStatusCode(Number(e.target.value))}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white font-mono"
                min={100}
                max={599}
                required
              />
            </div>
          </div>

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
                <option value="PATCH">PATCH</option>
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
