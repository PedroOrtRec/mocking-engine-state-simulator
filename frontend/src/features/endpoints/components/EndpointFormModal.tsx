import { useState, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  endpointsApi,
  type MockEndpoint,
  type HttpMethod,
  type MockEndpointPayload,
} from '../api/endpoints-api';
import {
  serializeRulesToJson,
  parseJsonToRules,
  extractPathParams,
  extractSchemaFields,
  isTemplatePlaceholder,
  type StateMutationRule,
  type StateMutationOp,
  type StateValueType,
} from '../utils/mutation-rules';
import {
  Wifi,
  Signal,
  AlertTriangle,
  Flame,
  Settings,
  HelpCircle,
  Database,
  Plus,
  Trash2,
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

  // State mutations rules (Option 3A)
  const [rules, setRules] = useState<StateMutationRule[]>(() =>
    parseJsonToRules(initialData?.stateUpdates)
  );

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

  // State mutation rules handlers
  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        property: '',
        op: 'set',
        valueType: 'string',
        value: '',
      },
    ]);
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRule = (id: string, updates: Partial<StateMutationRule>) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        if (updates.op === 'toggle' || updates.op === 'unset') {
          updated.value = '';
        } else if (updates.op === 'inc' || updates.op === 'dec') {
          updated.valueType = 'number';
          if (!updated.value) updated.value = '1';
        }
        return updated;
      })
    );
  };

  const serializedPreview = serializeRulesToJson(rules);
  const detectedPathParams = extractPathParams(pathPattern);
  const detectedSchemaFields = extractSchemaFields(requestSchema);
  const hasDetectedVariables =
    detectedPathParams.length > 0 || detectedSchemaFields.length > 0;

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
    const serializedStateUpdates = serializeRulesToJson(rules);

    const payload: MockEndpointPayload = {
      name: name.trim(),
      httpMethod,
      pathPattern: normalizedPath,
      statusCode,
      responseBody,
      responseHeaders: responseHeaders.trim() ? responseHeaders.trim() : undefined,
      requestSchema: requestSchema.trim() ? requestSchema.trim() : undefined,
      stateUpdates: serializedStateUpdates,
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
            Define la ruta, respuesta, mutaciones de estado y simula condiciones de red en tiempo real
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
            {detectedPathParams.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <span className="text-[10px] text-slate-400">Parámetros detectados:</span>
                {detectedPathParams.map((param) => (
                  <span
                    key={param}
                    className="px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/80 text-[10px] font-mono text-indigo-300"
                  >
                    {`{{path.${param}}}`}
                  </span>
                ))}
              </div>
            )}
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

        {/* SECCIÓN INTEGRADA: MUTACIONES DE ESTADO DE SESIÓN (OPCIÓN 3A) */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
              <Database className="h-4 w-4 text-cyan-400" />
              <span>Mutaciones de Estado de Sesión (Opcional)</span>
            </div>
            <button
              type="button"
              onClick={handleAddRule}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 text-xs font-medium rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir regla de estado</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Modifica automáticamente las variables del estado de la sesión (PostgreSQL / Redis) tras responder esta petición.
            Soporta operadores atómicos e interpolación <code className="text-indigo-300 font-mono">{'{{path.*}}'}</code> y <code className="text-indigo-300 font-mono">{'{{body.*}}'}</code>.
          </p>

          {rules.length === 0 ? (
            <div className="py-3 text-center text-xs text-slate-500 border border-dashed border-slate-800/80 rounded-lg">
              No hay mutaciones de estado configuradas. Pulsa «Añadir regla de estado» para agregar una.
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule, idx) => {
                const isToggleOrUnset = rule.op === 'toggle' || rule.op === 'unset';
                const showValueType = rule.op === 'set' || rule.op === 'push';
                const isBooleanSelect =
                  rule.valueType === 'boolean' &&
                  showValueType &&
                  !isTemplatePlaceholder(rule.value);

                return (
                  <div
                    key={rule.id}
                    className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {/* Propiedad */}
                      <div className="w-full sm:w-1/4">
                        <label htmlFor={`rule-prop-${rule.id}`} className="sr-only">
                          Propiedad {idx + 1}
                        </label>
                        <input
                          id={`rule-prop-${rule.id}`}
                          type="text"
                          value={rule.property}
                          onChange={(e) => handleUpdateRule(rule.id, { property: e.target.value })}
                          placeholder="Propiedad (ej. balance)"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                        />
                      </div>

                      {/* Operación */}
                      <div className="w-full sm:w-1/4">
                        <label htmlFor={`rule-op-${rule.id}`} className="sr-only">
                          Operación {idx + 1}
                        </label>
                        <select
                          id={`rule-op-${rule.id}`}
                          value={rule.op}
                          onChange={(e) =>
                            handleUpdateRule(rule.id, { op: e.target.value as StateMutationOp })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-indigo-300 font-medium focus:outline-none focus:border-indigo-500 text-xs"
                        >
                          <option value="set">Asignar (=)</option>
                          <option value="inc">Incrementar (+ $inc)</option>
                          <option value="dec">Decrementar (- $dec)</option>
                          <option value="toggle">Invertir booleano (! $toggle)</option>
                          <option value="push">Añadir a lista ($push)</option>
                          <option value="unset">Eliminar ($unset)</option>
                        </select>
                      </div>

                      {/* Tipo de valor (solo para set o push) */}
                      {showValueType && (
                        <div className="w-full sm:w-1/5">
                          <label htmlFor={`rule-valtype-${rule.id}`} className="sr-only">
                            Tipo de valor {idx + 1}
                          </label>
                          <select
                            id={`rule-valtype-${rule.id}`}
                            value={rule.valueType}
                            onChange={(e) =>
                              handleUpdateRule(rule.id, {
                                valueType: e.target.value as StateValueType,
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500 text-xs"
                          >
                            <option value="string">Texto / Var</option>
                            <option value="number">Número</option>
                            <option value="boolean">Booleano</option>
                            <option value="json">JSON</option>
                          </select>
                        </div>
                      )}

                      {/* Valor */}
                      <div className="flex-1">
                        {isToggleOrUnset ? (
                          <span className="text-[11px] text-slate-500 italic block py-1.5 px-2">
                            No requiere valor
                          </span>
                        ) : isBooleanSelect ? (
                          <div>
                            <label htmlFor={`rule-val-bool-${rule.id}`} className="sr-only">
                              Valor booleano {idx + 1}
                            </label>
                            <select
                              id={`rule-val-bool-${rule.id}`}
                              value={rule.value === 'false' ? 'false' : 'true'}
                              onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-emerald-400 font-mono text-xs focus:outline-none focus:border-indigo-500"
                            >
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label htmlFor={`rule-val-text-${rule.id}`} className="sr-only">
                              Valor {idx + 1}
                            </label>
                            <input
                              id={`rule-val-text-${rule.id}`}
                              type="text"
                              value={rule.value}
                              onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                              placeholder={
                                rule.op === 'inc' || rule.op === 'dec'
                                  ? 'ej. 1 o {{body.amount}}'
                                  : 'ej. valor o {{body.name}}'
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-emerald-400 font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                            />
                          </div>
                        )}
                      </div>

                      {/* Botón eliminar fila */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(rule.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors self-end sm:self-center"
                        title="Eliminar regla"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Chips interactivos de variables detectadas (Ruta y Request Schema) */}
                    {!isToggleOrUnset && hasDetectedVariables && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-400">Insertar variable:</span>
                        {detectedPathParams.map((param) => (
                          <button
                            key={`path-${param}`}
                            type="button"
                            onClick={() =>
                              handleUpdateRule(rule.id, {
                                value: `{{path.${param}}}`,
                              })
                            }
                            className="px-1.5 py-0.5 rounded bg-indigo-950/50 hover:bg-indigo-900/70 border border-indigo-800/70 text-[10px] font-mono text-indigo-300 transition-colors"
                            title={`Usar parámetro de ruta {{path.${param}}}`}
                          >
                            {`{{path.${param}}}`}
                          </button>
                        ))}
                        {detectedSchemaFields.map((field) => (
                          <button
                            key={`body-${field.path}`}
                            type="button"
                            onClick={() =>
                              handleUpdateRule(rule.id, {
                                value: `{{body.${field.path}}}`,
                                valueType: showValueType ? field.valueType : rule.valueType,
                              })
                            }
                            className="px-1.5 py-0.5 rounded bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-800/70 text-[10px] font-mono text-emerald-300 transition-colors"
                            title={`Usar campo de request body {{body.${field.path}}} (${field.valueType})`}
                          >
                            {`{{body.${field.path}}}`}
                            <span className="ml-1 text-[9px] text-emerald-400/70">
                              ({field.valueType})
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {serializedPreview && (
                <div className="pt-1 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Vista previa JSON generada (stateUpdates enviado al backend):
                  </span>
                  <pre className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-cyan-300 font-mono text-[11px] overflow-x-auto max-h-24">
                    {serializedPreview}
                  </pre>
                </div>
              )}
            </div>
          )}
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
