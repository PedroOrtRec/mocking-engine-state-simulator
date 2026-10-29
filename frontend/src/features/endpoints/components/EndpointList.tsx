import { useState } from 'react';
import { useEndpoints } from '../hooks/use-endpoints';
import type { MockEndpoint } from '../api/endpoints-api';
import { HttpMethodBadge } from './HttpMethodBadge';
import { EndpointFormModal } from './EndpointFormModal';
import { EndpointCopyModal } from './EndpointCopyModal';
import { Copy, Plus, Power, Trash2, Pencil, Clock, AlertTriangle, Database } from 'lucide-react';

interface EndpointListProps {
  activeSessionKey?: string;
}

export function EndpointList({ activeSessionKey = 'default' }: EndpointListProps) {
  const { endpoints, isLoading, toggleEndpoint, deleteEndpoint } = useEndpoints();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<MockEndpoint | null>(null);
  const [copyingEndpoint, setCopyingEndpoint] = useState<MockEndpoint | null>(null);

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

  const handleOpenCopyModal = (ep: MockEndpoint) => {
    setCopyingEndpoint(ep);
  };

  const handleCloseCopyModal = () => {
    setCopyingEndpoint(null);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Mock Studio — Endpoints Registrados</h2>
          <p className="text-xs text-muted-foreground">
            Rutas activas servidas bajo <code className="text-primary font-mono">/mock/**</code> con el contexto de sesión actual (<code className="text-primary font-mono font-medium">{activeSessionKey}</code>)
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-3.5 py-2 bg-primary hover:bg-primary/90 text-xs font-medium text-primary-foreground rounded-lg transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nuevo Endpoint
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">Cargando endpoints...</div>
      ) : endpoints.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
          No hay endpoints registrados todavía. Crea el primero pulsando «Nuevo Endpoint».
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
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
            <tbody className="divide-y divide-border text-foreground">
              {endpoints.map((ep) => {
                const hasDelay = typeof ep.delayMs === 'number' && ep.delayMs > 0;
                const hasErrorRate = typeof ep.errorRate === 'number' && ep.errorRate > 0;
                const hasStateUpdates =
                  typeof ep.stateUpdates === 'string' &&
                  ep.stateUpdates.trim() !== '' &&
                  ep.stateUpdates.trim() !== '{}';

                return (
                  <tr key={ep.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{ep.name}</td>
                    <td className="py-2.5 px-3">
                      <HttpMethodBadge method={ep.httpMethod} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-foreground">{ep.pathPattern}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{ep.statusCode}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {hasStateUpdates && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 dark:bg-cyan-950/60 dark:border-cyan-800"
                            title="Aplica mutaciones de estado automáticas en sesión"
                          >
                            <Database className="h-2.5 w-2.5" />
                            Mutación Estado
                          </span>
                        )}
                        {hasDelay && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-800"
                            title={`Latencia: ${ep.delayMs}ms`}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {ep.delayMs}ms
                          </span>
                        )}
                        {hasErrorRate && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-800"
                            title={`Tasa de error: ${Math.round(ep.errorRate! * 100)}% (${ep.failureStatusCode ?? 500})`}
                          >
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {Math.round(ep.errorRate! * 100)}% err
                          </span>
                        )}
                        {!hasDelay && !hasErrorRate && !hasStateUpdates && (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          ep.active
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 dark:border-emerald-800 dark:bg-emerald-950/60'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {ep.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenCopyModal(ep)}
                          className="p-1.5 bg-secondary hover:bg-muted text-secondary-foreground rounded-md transition-colors border border-border/50 cursor-pointer"
                          title="Construir y copiar comando cURL con parámetros y body válidos"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleEdit(ep)}
                          className="p-1.5 bg-secondary hover:bg-muted text-secondary-foreground rounded-md transition-colors border border-border/50 cursor-pointer"
                          title="Editar endpoint y controles de caos"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => toggleEndpoint(ep.id)}
                          className="p-1.5 bg-secondary hover:bg-muted text-secondary-foreground rounded-md transition-colors border border-border/50 cursor-pointer"
                          title={ep.active ? 'Desactivar' : 'Activar'}
                        >
                          <Power
                            className={`h-3.5 w-3.5 ${
                              ep.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => deleteEndpoint(ep.id)}
                          className="p-1.5 bg-secondary hover:bg-destructive/15 text-destructive rounded-md transition-colors border border-border/50 cursor-pointer"
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
        activeSessionKey={activeSessionKey}
      />

      <EndpointCopyModal
        isOpen={Boolean(copyingEndpoint)}
        onClose={handleCloseCopyModal}
        endpoint={copyingEndpoint}
        activeSessionKey={activeSessionKey}
      />
    </div>
  );
}
