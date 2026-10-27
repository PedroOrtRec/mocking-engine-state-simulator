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
      const res = await apiClient.get<AuditLog[] | { content: AuditLog[] }>('/api/v1/admin/logs');
      return Array.isArray(res.data) ? res.data : (res.data.content ?? []);
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

      {isLoading ? (
        <div className="py-8 text-center text-sm text-slate-400">
          Cargando registros de auditoría...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl">
          Aún no se han interceptado peticiones en el motor.
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
      )}

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
