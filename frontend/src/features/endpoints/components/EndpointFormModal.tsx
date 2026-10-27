import { useState, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  endpointsApi,
  type MockEndpoint,
  type HttpMethod,
  type MockEndpointPayload,
} from '../api/endpoints-api';
import {
  Wifi,
  Signal,
  AlertTriangle,
  Flame,
  Settings,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export type NetworkProfileId = 'none' | 'wifi' | '4g' | 'fast-3g' | 'slow-3g' | 'custom';

interface NetworkProfile {
  readonly id: Exclude<NetworkProfileId, 'custom'>;
  readonly name: string;
  readonly delayMs: number;
  readonly icon: LucideIcon;
}

const NETWORK_PROFILES: readonly NetworkProfile[] = [
  { id: 'none', name: 'Sin Latencia', delayMs: 0, icon: Wifi },
  { id: 'wifi', name: 'WiFi Rápido (20ms)', delayMs: 20, icon: Wifi },
  { id: '4g', name: 'Móvil 4G (60ms)', delayMs: 60, icon: Signal },
  { id: 'fast-3g', name: 'Fast 3G (250ms)', delayMs: 250, icon: Signal },
  { id: 'slow-3g', name: 'Slow 3G (600ms)', delayMs: 600, icon: AlertTriangle },
];

function resolveProfileId(delayMs: number): NetworkProfileId {
  const match = NETWORK_PROFILES.find((p) => p.delayMs === delayMs);
  return match ? match.id : 'custom';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: MockEndpoint | null;
}

export function EndpointFormModal({ isOpen, onClose, initialData }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8">
        <EndpointFormContent
          key={initialData ? `edit-${initialData.id}` : 'create'}
          initialData={initialData}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

interface ContentProps {
  initialData?: MockEndpoint | null;
  onClose: () => void;
}

function EndpointFormContent({ initialData, onClose }: ContentProps) {
  const isEditing = !!initialData;
  const queryClient = useQueryClient();

  const [name, setName] = useState(initialData?.name ?? '');
  const [httpMethod, setHttpMethod] = useState<HttpMethod>(initialData?.httpMethod ?? 'GET');
  const [pathPattern, setPathPattern] = useState(initialData?.pathPattern ?? '/api/');
  const [statusCode, setStatusCode] = useState(initialData?.statusCode ?? 200);
  const [responseBody, setResponseBody] = useState(
    initialData?.responseBody ?? '{\n  "message": "success"\n}'
  );
  const [responseHeaders, setResponseHeaders] = useState(initialData?.responseHeaders ?? '');
  const [requestSchema, setRequestSchema] = useState(initialData?.requestSchema ?? '');

  // Chaos controls
  const initialDelay = initialData?.delayMs ?? 0;
  const [delayMs, setDelayMs] = useState(initialDelay);
  const [selectedProfileId, setSelectedProfileId] = useState<NetworkProfileId>(
    resolveProfileId(initialDelay)
  );

  const initialErrorRate = initialData?.errorRate ? Math.round(initialData.errorRate * 100) : 0;
  const [errorRate, setErrorRate] = useState(initialErrorRate);
  const [failureStatusCode, setFailureStatusCode] = useState(
    initialData?.failureStatusCode ?? 500
  );

  // Tabs / Collapsibles
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(initialData?.responseHeaders || initialData?.requestSchema)
  );

  // Validation errors
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameId = useId();
  const statusCodeId = useId();
  const httpMethodId = useId();
  const pathPatternId = useId();
  const responseBodyId = useId();
  const responseHeadersId = useId();
  const requestSchemaId = useId();

  const handleProfileSelect = (p: NetworkProfile) => {
    setSelectedProfileId(p.id);
    setDelayMs(p.delayMs);
  };

  const handleCustomDelayChange = (val: number) => {
    setDelayMs(val);
    setSelectedProfileId(resolveProfileId(val));
  };

  const handleBodyChange = (val: string) => {
    setResponseBody(val);
    try {
      JSON.parse(val);
      setBodyError(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'JSON inválido';
      setBodyError(`JSON inválido: ${message}`);
    }
  };

  const handleHeadersChange = (val: string) => {
    setResponseHeaders(val);
    if (!val.trim()) {
      setHeadersError(null);
      return;
    }
    try {
      JSON.parse(val);
      setHeadersError(null);
    } catch {
      setHeadersError('Las cabeceras deben ser un JSON válido (clave-valor)');
    }
  };

  const handleSchemaChange = (val: string) => {
    setRequestSchema(val);
    if (!val.trim()) {
      setSchemaError(null);
      return;
    }
    try {
      JSON.parse(val);
      setSchemaError(null);
    } catch {
      setSchemaError('El esquema debe tener formato JSON Schema válido');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate body
    try {
      JSON.parse(responseBody);
    } catch {
      setBodyError('El cuerpo de la respuesta debe tener formato JSON válido');
      return;
    }

    if (responseHeaders.trim()) {
      try {
        JSON.parse(responseHeaders);
      } catch {
        setHeadersError('Las cabeceras deben tener formato JSON válido');
        return;
      }
    }

    if (requestSchema.trim()) {
      try {
        JSON.parse(requestSchema);
      } catch {
        setSchemaError('El esquema de validación debe tener formato JSON válido');
        return;
      }
    }

    const normalizedPath = pathPattern.startsWith('/') ? pathPattern : `/${pathPattern}`;
    const normalizedErrorRate = errorRate > 0 ? Number((errorRate / 100).toFixed(2)) : 0.0;

    const payload: MockEndpointPayload = {
      name: name.trim(),
      httpMethod,
      pathPattern: normalizedPath,
      statusCode,
      responseBody,
      responseHeaders: responseHeaders.trim() ? responseHeaders.trim() : undefined,
      requestSchema: requestSchema.trim() ? requestSchema.trim() : undefined,
      delayMs: delayMs > 0 ? delayMs : 0,
      errorRate: normalizedErrorRate,
      failureStatusCode: errorRate > 0 ? failureStatusCode : undefined,
      active: initialData ? initialData.active : true,
    };

    setIsSubmitting(true);
    try {
      if (isEditing && initialData) {
        await endpointsApi.update(initialData.id, payload);
      } else {
        await endpointsApi.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['mockEndpoints'] });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } }; message?: string };
      setSubmitError(
        errorObj.response?.data?.detail ??
          errorObj.message ??
          'Ocurrió un error al guardar el endpoint'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white">
            {isEditing ? 'Editar Mock Endpoint' : 'Registrar Mock Endpoint'}
          </h2>
          <p className="text-xs text-slate-400">
            Define la ruta, respuesta y simula condiciones de red en tiempo real
          </p>
        </div>
      </div>

      {submitError && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-lg">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre y Estado HTTP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor={nameId} className="text-xs font-medium text-slate-300">
              Nombre descriptivo
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              placeholder="ej. Obtener perfil de usuario"
              required
            />
          </div>
          <div>
            <label htmlFor={statusCodeId} className="text-xs font-medium text-slate-300">
              Código HTTP Éxito
            </label>
            <input
              id={statusCodeId}
              type="number"
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              min={100}
              max={599}
              required
            />
          </div>
        </div>

        {/* Método y Patrón de Ruta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor={httpMethodId} className="text-xs font-medium text-slate-300">
              Método HTTP
            </label>
            <select
              id={httpMethodId}
              value={httpMethod}
              onChange={(e) => setHttpMethod(e.target.value as HttpMethod)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={pathPatternId} className="text-xs font-medium text-slate-300">
              Patrón de Ruta (/mock/**)
            </label>
            <input
              id={pathPatternId}
              type="text"
              value={pathPattern}
              onChange={(e) => setPathPattern(e.target.value)}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              placeholder="/api/v1/users/{id}"
              required
            />
          </div>
        </div>

        {/* Cuerpo de respuesta JSON */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor={responseBodyId} className="text-xs font-medium text-slate-300">
              Cuerpo de la Respuesta (JSON)
            </label>
            {bodyError && <span className="text-xs text-rose-400">{bodyError}</span>}
          </div>
          <textarea
            id={responseBodyId}
            rows={5}
            value={responseBody}
            onChange={(e) => handleBodyChange(e.target.value)}
            className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-lg p-3 text-emerald-400 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {/* SECCIÓN INTEGRADA: SIMULACIÓN DE RED & CAOS */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
            <Flame className="h-4 w-4 text-amber-400" />
            <span>Simulación de Red & Caos Inyectado</span>
          </div>

          {/* Perfiles de Red Predefinidos */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-400">
              Perfil de Conectividad Móvil
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NETWORK_PROFILES.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedProfileId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProfileSelect(p)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slider de Latencia Adicional */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Latencia Simulada</span>
              <span className="font-mono text-indigo-400 font-semibold">{delayMs} ms</span>
            </div>
            <input
              type="range"
              min="0"
              max="3000"
              step="50"
              value={delayMs}
              onChange={(e) => handleCustomDelayChange(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Slider de Tasa de Fallo (Error Rate) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Tasa de Error Inyectada (Caos)</span>
              <span
                className={`font-mono font-semibold ${
                  errorRate > 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {errorRate}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={errorRate}
              onChange={(e) => setErrorRate(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Selector de HTTP de fallo cuando errorRate > 0 */}
          {errorRate > 0 && (
            <div className="space-y-1">
              <label htmlFor="failure-code-select" className="text-xs text-slate-300">
                Código de Estado en Fallo
              </label>
              <select
                id="failure-code-select"
                value={failureStatusCode}
                onChange={(e) => setFailureStatusCode(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-rose-300 font-mono"
              >
                <option value="500">500 Internal Server Error</option>
                <option value="502">502 Bad Gateway</option>
                <option value="503">503 Service Unavailable</option>
                <option value="504">504 Gateway Timeout</option>
                <option value="429">429 Too Many Requests (Rate Limit)</option>
              </select>
            </div>
          )}
        </div>

        {/* Sección Avanzada Opcional (Cabeceras y Esquema) */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>{showAdvanced ? 'Ocultar Opciones Avanzadas' : 'Ver Opciones Avanzadas (Cabeceras & Esquema)'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={responseHeadersId} className="text-xs font-medium text-slate-300 flex items-center gap-1">
                    <span>Cabeceras de Respuesta Personalizadas (JSON)</span>
                    <HelpCircle className="h-3 w-3 text-slate-500" />
                  </label>
                  {headersError && <span className="text-xs text-rose-400">{headersError}</span>}
                </div>
                <textarea
                  id={responseHeadersId}
                  rows={2}
                  value={responseHeaders}
                  onChange={(e) => handleHeadersChange(e.target.value)}
                  placeholder={'{\n  "X-Custom-Header": "value"\n}'}
                  className="w-full font-mono text-xs bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={requestSchemaId} className="text-xs font-medium text-slate-300 flex items-center gap-1">
                    <span>Esquema de Validación de Solicitud (JSON Schema)</span>
                    <HelpCircle className="h-3 w-3 text-slate-500" />
                  </label>
                  {schemaError && <span className="text-xs text-rose-400">{schemaError}</span>}
                </div>
                <textarea
                  id={requestSchemaId}
                  rows={2}
                  value={requestSchema}
                  onChange={(e) => handleSchemaChange(e.target.value)}
                  placeholder={'{\n  "type": "object",\n  "required": ["userId"]\n}'}
                  className="w-full font-mono text-xs bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Acciones del formulario */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !!bodyError || !!headersError || !!schemaError}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white rounded-lg transition-colors shadow-sm"
          >
            {isSubmitting
              ? 'Guardando...'
              : isEditing
              ? 'Guardar Cambios'
              : 'Crear Endpoint'}
          </button>
        </div>
      </form>
    </div>
  );
}
