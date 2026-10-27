import { useState } from 'react';
import { useEndpoints } from '../hooks/use-endpoints';
import type { MockEndpoint } from '../api/endpoints-api';
import { HttpMethodBadge } from './HttpMethodBadge';
import { EndpointFormModal } from './EndpointFormModal';
import { Copy, Check, Plus, Power, Trash2, Pencil, Clock, AlertTriangle, Database } from 'lucide-react';

interface EndpointListProps {
  activeSessionKey?: string;
}

export function EndpointList({ activeSessionKey = 'default' }: EndpointListProps) {
  const { endpoints, isLoading, toggleEndpoint, deleteEndpoint } = useEndpoints();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<MockEndpoint | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const handleCreateNew = () => {
    setEditingEndpoint(null);
    setIsModalOpen(true);
  };

  const handleEdit = (ep: MockEndpoint) => {
    setEditingEndpoint(ep);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEndpoint(null);
  };

  const handleCopyCurl = (ep: MockEndpoint) => {
    const cleanPath = ep.pathPattern.startsWith('/') ? ep.pathPattern : `/${ep.pathPattern}`;
    const sessionHeader = `-H "X-Session-ID: ${activeSessionKey || 'default'}"`;
    const curlCmd = `curl -i -X ${ep.httpMethod} "${baseUrl}/mock${cleanPath}" ${sessionHeader}`;
    navigator.clipboard.writeText(curlCmd);
    setCopiedId(ep.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Mock Studio — Endpoints Registrados</h2>
          <p className="text-xs text-slate-400">
            Rutas activas servidas bajo <code className="text-indigo-400 font-mono">/mock/**</code> con el contexto de sesión actual (<code className="text-indigo-300 font-mono">{activeSessionKey}</code>)
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white rounded-lg transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Nuevo Endpoint
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400">Cargando endpoints...</div>
      ) : endpoints.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No hay endpoints registrados todavía. Crea el primero pulsando «Nuevo Endpoint».
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Nombre</th>
                <th className="py-2.5 px-3">Método</th>
                <th className="py-2.5 px-3">Ruta (/mock)</th>
                <th className="py-2.5 px-3">HTTP</th>
                <th className="py-2.5 px-3">Efectos & Caos</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {endpoints.map((ep) => {
                const hasDelay = typeof ep.delayMs === 'number' && ep.delayMs > 0;
                const hasErrorRate = typeof ep.errorRate === 'number' && ep.errorRate > 0;
                const hasStateUpdates =
                  typeof ep.stateUpdates === 'string' &&
                  ep.stateUpdates.trim() !== '' &&
                  ep.stateUpdates.trim() !== '{}';

                return (
                  <tr key={ep.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-white">{ep.name}</td>
                    <td className="py-2.5 px-3">
                      <HttpMethodBadge method={ep.httpMethod} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-200">{ep.pathPattern}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">{ep.statusCode}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {hasStateUpdates && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/60 border border-cyan-800 text-cyan-300"
                            title="Aplica mutaciones de estado automáticas en sesión"
                          >
                            <Database className="h-2.5 w-2.5" />
                            Mutación Estado
                          </span>
                        )}
                        {hasDelay && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950/60 border border-indigo-800 text-indigo-300"
                            title={`Latencia: ${ep.delayMs}ms`}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {ep.delayMs}ms
                          </span>
                        )}
                        {hasErrorRate && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-950/60 border border-rose-800 text-rose-300"
                            title={`Tasa de error: ${Math.round(ep.errorRate! * 100)}% (${ep.failureStatusCode ?? 500})`}
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {Math.round(ep.errorRate! * 100)}% err
                          </span>
                        )}
                        {!hasDelay && !hasErrorRate && !hasStateUpdates && (
                          <span className="text-[11px] text-slate-500">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          ep.active
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {ep.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopyCurl(ep)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                          title="Copiar comando cURL con la sesión activa"
                        >
                          {copiedId === ep.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleEdit(ep)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                          title="Editar endpoint y controles de caos"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => toggleEndpoint(ep.id)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                          title={ep.active ? 'Desactivar' : 'Activar'}
                        >
                          <Power
                            className={`h-3.5 w-3.5 ${
                              ep.active ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => deleteEndpoint(ep.id)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 rounded-md transition-colors"
                          title="Eliminar endpoint"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EndpointFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialData={editingEndpoint}
      />
    </div>
  );
}
