import { useState, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/use-auth-store';
import { HttpMethodBadge } from '@/features/endpoints/components/HttpMethodBadge';
import { Activity, Clock, Eye, Filter, X, Calendar, User, Server } from 'lucide-react';

export interface AuditLog {
  id: string;
  httpMethod: string;
  requestUri: string;
  statusCode: number;
  durationMs: number;
  sessionKey: string;
  ownerUsername?: string;
  timestamp: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
}

export function AuditLogViewer() {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [sessionFilter, setSessionFilter] = useState('');
  const sessionFilterInputId = useId();
  const username = useAuthStore((state) => state.user?.username ?? 'anonymous');

  // Consulta los logs de MongoDB con refresco automático cada 3 segundos y filtro por sessionKey:
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs', username, sessionFilter.trim()],
    queryFn: async () => {
      const trimmed = sessionFilter.trim();
      const params = trimmed ? { sessionKey: trimmed } : undefined;
      const res = await apiClient.get<AuditLog[] | { content: AuditLog[] }>('/api/v1/admin/logs', {
        params,
      });
      return Array.isArray(res.data) ? res.data : (res.data.content ?? []);
    },
    refetchInterval: 3000,
  });

  const formatHeaders = (headers?: Record<string, string>) => {
    if (!headers || Object.keys(headers).length === 0) return '(Sin cabeceras registradas)';
    return JSON.stringify(headers, null, 2);
  };

  const formatBody = (body?: string) => {
    if (!body || !body.trim()) return '(Vacío)';
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Encabezado y Barra de Filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Monitor de Peticiones en Vivo (MongoDB)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Trazas de auditoría e inspección de payloads interceptados por el motor
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Auto-refresco (3s)
          </span>

          {/* Filtro por SessionKey */}
          <div className="relative">
            <label htmlFor={sessionFilterInputId} className="sr-only">Filtrar por Session Key</label>
            <Filter className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              id={sessionFilterInputId}
              type="text"
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              placeholder="Filtrar por sesión..."
              className="pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
            />
            {sessionFilter && (
              <button
                onClick={() => setSessionFilter('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-white"
                title="Limpiar filtro"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400">
          Cargando registros de auditoría...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
          {sessionFilter
            ? `No se encontraron peticiones para la sesión "${sessionFilter}".`
            : 'Aún no se han interceptado peticiones en el motor.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Método</th>
                <th className="py-2.5 px-3">Ruta</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Duración</th>
                <th className="py-2.5 px-3">Sesión</th>
                <th className="py-2.5 px-3">Fecha y Hora</th>
                <th className="py-2.5 px-3 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <HttpMethodBadge method={log.httpMethod} />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-200">{log.requestUri}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`font-mono font-semibold px-2 py-0.5 rounded ${
                        log.statusCode < 400
                          ? 'text-emerald-400 bg-emerald-950/40'
                          : log.statusCode < 500
                          ? 'text-amber-400 bg-amber-950/40'
                          : 'text-rose-400 bg-rose-950/40'
                      }`}
                    >
                      {log.statusCode}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {log.durationMs} ms
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-indigo-300">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                      {log.sessionKey || 'default'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors inline-flex items-center gap-1 text-xs"
                      title="Inspeccionar Payload Completo"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Ver</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal visor completo de payload e inspección */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Detalle de la Petición Interceptada</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Metadatos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Método & Ruta</span>
                <span className="font-mono text-slate-200 font-medium">
                  {selectedLog.httpMethod} {selectedLog.requestUri}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Estado HTTP</span>
                <span
                  className={`font-mono font-bold ${
                    selectedLog.statusCode < 400
                      ? 'text-emerald-400'
                      : selectedLog.statusCode < 500
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {selectedLog.statusCode}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Duración</span>
                <span className="font-mono text-slate-300">{selectedLog.durationMs} ms</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Sesión</span>
                <span className="font-mono text-indigo-300">{selectedLog.sessionKey || 'default'}</span>
              </div>
            </div>

            {/* Owner y Timestamp */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              {selectedLog.ownerUsername && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <span>Propietario: <strong className="text-slate-200">{selectedLog.ownerUsername}</strong></span>
                </div>
              )}
              {selectedLog.timestamp && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>Fecha: {new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Cabeceras de la petición */}
            <div className="space-y-1.5 text-xs">
              <span className="text-slate-300 font-medium block">Cabeceras de la Petición:</span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto max-h-36">
                {formatHeaders(selectedLog.requestHeaders)}
              </pre>
            </div>

            {/* Cuerpo de la petición */}
            <div className="space-y-1.5 text-xs">
              <span className="text-slate-300 font-medium block">Cuerpo de la Petición (Request Body):</span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-indigo-300 font-mono text-[11px] overflow-x-auto max-h-36">
                {formatBody(selectedLog.requestBody)}
              </pre>
            </div>

            {/* Cuerpo de la respuesta */}
            <div className="space-y-1.5 text-xs">
              <span className="text-slate-300 font-medium block">Cuerpo de la Respuesta (Response Body):</span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">
                {formatBody(selectedLog.responseBody)}
              </pre>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
