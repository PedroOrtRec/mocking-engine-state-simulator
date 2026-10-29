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
  serializeSchemaRulesToJson,
  parseJsonToSchemaRules,
  extractPathParams,
  extractSchemaFields,
  extractStateProperties,
  isTemplatePlaceholder,
  type StateMutationRule,
  type StateMutationOp,
  type StateValueType,
  type StatePropertyHint,
  type SchemaFieldRule,
  type SchemaPropertyType,
  type SchemaStringFormat,
} from '../utils/mutation-rules';
import { STATES_QUERY_KEY } from '@/features/states/hooks/use-states';
import type { ScenarioState } from '@/features/states/api/states-api';
import {
  Wifi,
  Signal,
  AlertTriangle,
  Flame,
  Settings,
  HelpCircle,
  Database,
  ShieldCheck,
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

const RECOMMENDED_STATUS_BY_METHOD: Record<HttpMethod, number> = {
  GET: 200,
  POST: 201,
  PUT: 200,
  PATCH: 200,
  DELETE: 204,
};

function resolveProfileId(delayMs: number): NetworkProfileId {
  const match = NETWORK_PROFILES.find((p) => p.delayMs === delayMs);
  return match ? match.id : 'custom';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: MockEndpoint | null;
  activeSessionKey?: string;
}

export function EndpointFormModal({ isOpen, onClose, initialData, activeSessionKey }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-card text-card-foreground border border-border rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8">
        <EndpointFormContent
          key={initialData ? `edit-${initialData.id}` : 'create'}
          initialData={initialData}
          onClose={onClose}
          activeSessionKey={activeSessionKey}
        />
      </div>
    </div>
  );
}

interface ContentProps {
  initialData?: MockEndpoint | null;
  onClose: () => void;
  activeSessionKey?: string;
}

function EndpointFormContent({ initialData, onClose, activeSessionKey }: ContentProps) {
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

  // Request Schema visual builder rules (Row 4)
  const [schemaRules, setSchemaRules] = useState<SchemaFieldRule[]>(() =>
    parseJsonToSchemaRules(initialData?.requestSchema)
  );
  const [expandedConstraintIds, setExpandedConstraintIds] = useState<{
    [fieldId: string]: boolean;
  }>(() => {
    const initialExpanded: { [fieldId: string]: boolean } = {};
    for (const r of parseJsonToSchemaRules(initialData?.requestSchema)) {
      if (
        r.minimum ||
        r.maximum ||
        r.minLength ||
        r.maxLength ||
        r.pattern ||
        r.format ||
        r.enumValues
      ) {
        initialExpanded[r.id] = true;
      }
    }
    return initialExpanded;
  });

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
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialData?.responseHeaders));

  // Validation errors
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameId = useId();
  const statusCodeId = useId();
  const httpMethodId = useId();
  const pathPatternId = useId();
  const responseBodyId = useId();
  const responseHeadersId = useId();

  const handleMethodChange = (newMethod: HttpMethod) => {
    setHttpMethod(newMethod);
    setStatusCode(RECOMMENDED_STATUS_BY_METHOD[newMethod]);
  };

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

  // Schema builder handlers
  const handleAddSchemaField = () => {
    setSchemaRules((prev) => [
      ...prev,
      {
        id: `schema-field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: '',
        type: 'string',
        required: true,
      },
    ]);
  };

  const handleRemoveSchemaField = (id: string) => {
    setSchemaRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateSchemaField = (id: string, updates: Partial<SchemaFieldRule>) => {
    setSchemaRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const toggleSchemaConstraints = (id: string) => {
    setExpandedConstraintIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Extract properties from the active session state (and any other user states in cache)
  const cachedStateQueries = queryClient.getQueriesData<ScenarioState[]>({
    queryKey: STATES_QUERY_KEY,
  });
  const cachedStates = cachedStateQueries.flatMap(([, data]) => data ?? []);
  const availableStateProperties: StatePropertyHint[] = (() => {
    const seen = new Set<string>();
    const list: StatePropertyHint[] = [];
    const activeStateObj = cachedStates.find((s) => s.sessionKey === activeSessionKey);
    const orderedStates = activeStateObj
      ? [activeStateObj, ...cachedStates.filter((s) => s.sessionKey !== activeSessionKey)]
      : cachedStates;

    for (const st of orderedStates) {
      for (const prop of extractStateProperties(st.stateJson)) {
        if (!seen.has(prop.name)) {
          seen.add(prop.name);
          list.push(prop);
        }
      }
    }
    return list;
  })();

  const [customPropertyIds, setCustomPropertyIds] = useState<{ [ruleId: string]: boolean }>({});

  // State mutation rules handlers
  const handleAddRule = () => {
    const defaultProp = availableStateProperties[0];
    setRules((prev) => [
      ...prev,
      {
        id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        property: defaultProp ? defaultProp.name : '',
        op: 'set',
        valueType: defaultProp ? defaultProp.valueType : 'string',
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

  const serializedSchemaPreview = serializeSchemaRulesToJson(schemaRules);
  const serializedPreview = serializeRulesToJson(rules);
  const detectedPathParams = extractPathParams(pathPattern);
  const detectedSchemaFields = extractSchemaFields(serializedSchemaPreview);
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

    const normalizedPath = pathPattern.startsWith('/') ? pathPattern : `/${pathPattern}`;
    const normalizedErrorRate = errorRate > 0 ? Number((errorRate / 100).toFixed(2)) : 0.0;
    const serializedStateUpdates = serializeRulesToJson(rules);
    const serializedRequestSchema = serializeSchemaRulesToJson(schemaRules);

    const payload: MockEndpointPayload = {
      name: name.trim(),
      httpMethod,
      pathPattern: normalizedPath,
      statusCode,
      responseBody,
      responseHeaders: responseHeaders.trim() ? responseHeaders.trim() : undefined,
      requestSchema: serializedRequestSchema,
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
      await queryClient.invalidateQueries({ queryKey: ['mockEndpoints'] });
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
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {isEditing ? 'Editar Mock Endpoint' : 'Registrar Mock Endpoint'}
          </h2>
          <p className="text-xs text-muted-foreground">
            Define la ruta, respuesta, mutaciones de estado y simula condiciones de red en tiempo real
          </p>
        </div>
      </div>

      {submitError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-lg">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1ª FILA: Nombre descriptivo */}
        <div>
          <label htmlFor={nameId} className="text-xs font-medium text-foreground">
            Nombre descriptivo
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 bg-background border border-border rounded-lg p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            placeholder="ej. Obtener perfil de usuario"
            required
          />
        </div>

        {/* 2ª FILA: Patrón de Ruta */}
        <div>
          <label htmlFor={pathPatternId} className="text-xs font-medium text-foreground">
            Patrón de Ruta (/mock/**)
          </label>
          <input
            id={pathPatternId}
            type="text"
            value={pathPattern}
            onChange={(e) => setPathPattern(e.target.value)}
            className="w-full mt-1 bg-background border border-border rounded-lg p-2 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            placeholder="/api/v1/users/{id}"
            required
          />
          {detectedPathParams.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <span className="text-[10px] text-muted-foreground">Parámetros detectados:</span>
              {detectedPathParams.map((param) => (
                <span
                  key={param}
                  className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-[10px] font-mono text-primary font-medium"
                >
                  {`{{path.${param}}}`}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3ª FILA: Método HTTP y Código HTTP de Éxito */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={httpMethodId} className="text-xs font-medium text-foreground">
              Método HTTP
            </label>
            <select
              id={httpMethodId}
              value={httpMethod}
              onChange={(e) => handleMethodChange(e.target.value as HttpMethod)}
              className="w-full mt-1 bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-primary font-medium"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor={statusCodeId} className="text-xs font-medium text-foreground">
                Código HTTP Éxito
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">
                Recomendado ({httpMethod}): {RECOMMENDED_STATUS_BY_METHOD[httpMethod]}
              </span>
            </div>
            <input
              id={statusCodeId}
              type="number"
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
              className="w-full mt-1 bg-background border border-border rounded-lg p-2 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
              min={100}
              max={599}
              required
            />
          </div>
        </div>

        {/* 4ª FILA: CONSTRUCTOR VISUAL DE VALIDATION SCHEMA DEL BODY */}
        <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Esquema de Validación del Body (JSON Schema — Opcional)</span>
            </div>
            <button
              type="button"
              onClick={handleAddSchemaField}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir campo al body</span>
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Define de forma asistida los campos esperados en el body de la petición y sus restricciones. El constructor genera un{' '}
            <code className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">JSON Schema Draft-07</code> estricto y habilita los chips{' '}
            <code className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">{'{{body.*}}'}</code> en las mutaciones de estado.
          </p>

          {schemaRules.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              Sin esquema de validación de body. Pulsa «Añadir campo al body» para exigir contrato de entrada.
            </div>
          ) : (
            <div className="space-y-2">
              {schemaRules.map((field, idx) => {
                const isNumeric = field.type === 'number' || field.type === 'integer';
                const isString = field.type === 'string';
                const supportsConstraints = isNumeric || isString;
                const isExpanded = Boolean(expandedConstraintIds[field.id]);

                return (
                  <div
                    key={field.id}
                    className="p-2.5 bg-card border border-border rounded-lg text-xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {/* Nombre del campo */}
                      <div className="flex-1">
                        <label htmlFor={`schema-name-${field.id}`} className="sr-only">
                          Campo del body {idx + 1}
                        </label>
                        <input
                          id={`schema-name-${field.id}`}
                          type="text"
                          value={field.name}
                          onChange={(e) =>
                            handleUpdateSchemaField(field.id, { name: e.target.value })
                          }
                          placeholder="Nombre del campo (ej. amount)"
                          className="w-full bg-background border border-border rounded px-2 py-1.5 text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                        />
                      </div>

                      {/* Tipo JSON Schema */}
                      <div className="w-full sm:w-1/4">
                        <label htmlFor={`schema-type-${field.id}`} className="sr-only">
                          Tipo del campo {idx + 1}
                        </label>
                        <select
                          id={`schema-type-${field.id}`}
                          value={field.type}
                          onChange={(e) =>
                            handleUpdateSchemaField(field.id, {
                              type: e.target.value as SchemaPropertyType,
                            })
                          }
                          className="w-full bg-background border border-border rounded px-2 py-1.5 text-foreground font-medium focus:outline-none focus:border-primary text-xs"
                        >
                          <option value="string">string (Texto)</option>
                          <option value="number">number (Decimal)</option>
                          <option value="integer">integer (Entero)</option>
                          <option value="boolean">boolean (Booleano)</option>
                          <option value="object">object (Objeto)</option>
                          <option value="array">array (Lista)</option>
                        </select>
                      </div>

                      {/* Checkbox Obligatorio (required) */}
                      <label className="flex items-center gap-1.5 px-2 py-1 text-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            handleUpdateSchemaField(field.id, { required: e.target.checked })
                          }
                          className="rounded border-border bg-background text-primary focus:ring-0"
                        />
                        <span className="text-[11px]">Obligatorio</span>
                      </label>

                      {/* Botón de Restricciones avanzadas */}
                      {supportsConstraints && (
                        <button
                          type="button"
                          onClick={() => toggleSchemaConstraints(field.id)}
                          className={`px-2 py-1 rounded border text-[10px] font-medium transition-colors cursor-pointer ${
                            isExpanded
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                              : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/50'
                          }`}
                        >
                          Restricciones
                        </button>
                      )}

                      {/* Eliminar fila */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSchemaField(field.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/15 rounded transition-colors self-end sm:self-center cursor-pointer"
                        title="Eliminar campo del esquema"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Panel desplegable de restricciones por tipo */}
                    {supportsConstraints && isExpanded && (
                      <div className="pt-2 border-t border-border/70 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {isNumeric && (
                          <>
                            <div>
                              <label
                                htmlFor={`schema-min-${field.id}`}
                                className="text-[10px] text-muted-foreground block mb-0.5"
                              >
                                Valor mínimo (minimum)
                              </label>
                              <input
                                id={`schema-min-${field.id}`}
                                type="number"
                                value={field.minimum ?? ''}
                                onChange={(e) =>
                                  handleUpdateSchemaField(field.id, { minimum: e.target.value })
                                }
                                placeholder="ej. 1"
                                className="w-full bg-background border border-border rounded px-2 py-1 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`schema-max-${field.id}`}
                                className="text-[10px] text-muted-foreground block mb-0.5"
                              >
                                Valor máximo (maximum)
                              </label>
                              <input
                                id={`schema-max-${field.id}`}
                                type="number"
                                value={field.maximum ?? ''}
                                onChange={(e) =>
                                  handleUpdateSchemaField(field.id, { maximum: e.target.value })
                                }
                                placeholder="ej. 10000"
                                className="w-full bg-background border border-border rounded px-2 py-1 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                              />
                            </div>
                          </>
                        )}

                        {isString && (
                          <>
                            <div>
                              <label
                                htmlFor={`schema-minlen-${field.id}`}
                                className="text-[10px] text-muted-foreground block mb-0.5"
                              >
                                Longitud mín. (minLength)
                              </label>
                              <input
                                id={`schema-minlen-${field.id}`}
                                type="number"
                                min={0}
                                value={field.minLength ?? ''}
                                onChange={(e) =>
                                  handleUpdateSchemaField(field.id, { minLength: e.target.value })
                                }
                                placeholder="ej. 3"
                                className="w-full bg-background border border-border rounded px-2 py-1 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`schema-maxlen-${field.id}`}
                                className="text-[10px] text-muted-foreground block mb-0.5"
                              >
                                Longitud máx. (maxLength)
                              </label>
                              <input
                                id={`schema-maxlen-${field.id}`}
                                type="number"
                                min={0}
                                value={field.maxLength ?? ''}
                                onChange={(e) =>
                                  handleUpdateSchemaField(field.id, { maxLength: e.target.value })
                                }
                                placeholder="ej. 50"
                                className="w-full bg-background border border-border rounded px-2 py-1 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`schema-format-${field.id}`}
                                className="text-[10px] text-muted-foreground block mb-0.5"
                              >
                                Formato (format)
                              </label>
                              <select
                                id={`schema-format-${field.id}`}
                                value={field.format ?? ''}
                                onChange={(e) =>
                                  handleUpdateSchemaField(field.id, {
                                    format: e.target.value as SchemaStringFormat,
                                  })
                                }
                                className="w-full bg-background border border-border rounded px-2 py-1 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                              >
                                <option value="">Sin formato específico</option>
                                <option value="email">email</option>
                                <option value="uuid">uuid</option>
                                <option value="date-time">date-time</option>
                                <option value="uri">uri</option>
                              </select>
                            </div>
                            <div>
                              <label
                                htmlFor={`schema-pattern-${field.id}`}
                                className="text-[10px] text-muted-foreground block mb-0.5"
                              >
                                Expresión regular (pattern)
                              </label>
                              <input
                                id={`schema-pattern-${field.id}`}
                                type="text"
                                value={field.pattern ?? ''}
                                onChange={(e) =>
                                  handleUpdateSchemaField(field.id, { pattern: e.target.value })
                                }
                                placeholder="ej. ^[A-Z0-9_]+$"
                                className="w-full bg-background border border-border rounded px-2 py-1 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label
                                htmlFor={`schema-enum-${field.id}`}
                                className="text-[10px] text-muted-foreground block mb-0.5"
                              >
                                Valores permitidos (enum, separados por coma)
                              </label>
                              <input
                                id={`schema-enum-${field.id}`}
                                type="text"
                                value={field.enumValues ?? ''}
                                onChange={(e) =>
                                  handleUpdateSchemaField(field.id, { enumValues: e.target.value })
                                }
                                placeholder="ej. PENDING, PAID, CANCELLED"
                                className="w-full bg-background border border-border rounded px-2 py-1 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {detectedSchemaFields.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-muted-foreground">Campos del body detectados:</span>
                  {detectedSchemaFields.map((field) => (
                    <span
                      key={field.path}
                      className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-700 dark:text-emerald-300"
                    >
                      {`{{body.${field.path}}}`} ({field.valueType})
                    </span>
                  ))}
                </div>
              )}

              {serializedSchemaPreview && (
                <div className="pt-1 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    JSON Schema Draft-07 generado (solo lectura):
                  </span>
                  <pre className="p-2 bg-background border border-border rounded-lg text-emerald-600 dark:text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-28">
                    {serializedSchemaPreview}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5ª FILA: MUTACIONES DE ESTADO DE SESIÓN (OPCIÓN 3A) */}
        <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400">
              <Database className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span>Mutaciones de Estado de Sesión (Opcional)</span>
            </div>
            <button
              type="button"
              onClick={handleAddRule}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir regla de estado</span>
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Modifica automáticamente las variables del estado de la sesión (PostgreSQL / Redis) tras responder esta petición.
            Soporta operadores atómicos e interpolación <code className="text-primary font-mono">{'{{path.*}}'}</code> y <code className="text-primary font-mono">{'{{body.*}}'}</code>.
          </p>

          {rules.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
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
                    className="p-2.5 bg-card border border-border rounded-lg text-xs space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {/* Propiedad (Selector de campos del estado o texto libre) */}
                      <div className="w-full sm:w-1/4">
                        <label htmlFor={`rule-prop-${rule.id}`} className="sr-only">
                          Propiedad {idx + 1}
                        </label>
                        {availableStateProperties.length > 0 && !customPropertyIds[rule.id] ? (
                          <select
                            id={`rule-prop-${rule.id}`}
                            value={rule.property}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__custom__') {
                                setCustomPropertyIds((prev) => ({ ...prev, [rule.id]: true }));
                                handleUpdateRule(rule.id, { property: '' });
                                return;
                              }
                              const hint = availableStateProperties.find((p) => p.name === val);
                              handleUpdateRule(rule.id, {
                                property: val,
                                valueType:
                                  hint && showValueType ? hint.valueType : rule.valueType,
                              });
                            }}
                            className="w-full bg-background border border-border rounded px-2 py-1.5 text-foreground font-mono focus:outline-none focus:border-primary text-xs"
                          >
                            <option value="" disabled>
                              Propiedad del estado...
                            </option>
                            {availableStateProperties.map((prop) => (
                              <option key={prop.name} value={prop.name}>
                                {prop.name} ({prop.valueType})
                              </option>
                            ))}
                            {rule.property &&
                              !availableStateProperties.some((p) => p.name === rule.property) && (
                                <option value={rule.property}>{rule.property}</option>
                              )}
                            <option value="__custom__">+ Nueva propiedad...</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              id={`rule-prop-${rule.id}`}
                              type="text"
                              value={rule.property}
                              onChange={(e) =>
                                handleUpdateRule(rule.id, { property: e.target.value })
                              }
                              placeholder="Propiedad (ej. balance)"
                              className="w-full bg-background border border-border rounded px-2 py-1.5 text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                            />
                            {availableStateProperties.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomPropertyIds((prev) => ({ ...prev, [rule.id]: false }));
                                  if (!rule.property && availableStateProperties[0]) {
                                    handleUpdateRule(rule.id, {
                                      property: availableStateProperties[0].name,
                                      valueType: availableStateProperties[0].valueType,
                                    });
                                  }
                                }}
                                className="px-1.5 py-1 bg-secondary hover:bg-muted text-[10px] text-primary rounded shrink-0 border border-border cursor-pointer"
                                title="Elegir propiedad existente del estado"
                              >
                                Lista
                              </button>
                            )}
                          </div>
                        )}
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
                          className="w-full bg-background border border-border rounded px-2 py-1.5 text-primary font-medium focus:outline-none focus:border-primary text-xs"
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
                            className="w-full bg-background border border-border rounded px-2 py-1.5 text-foreground focus:outline-none focus:border-primary text-xs"
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
                          <span className="text-[11px] text-muted-foreground italic block py-1.5 px-2">
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
                              className="w-full bg-background border border-border rounded px-2 py-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-xs focus:outline-none focus:border-primary"
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
                              className="w-full bg-background border border-border rounded px-2 py-1.5 text-emerald-600 dark:text-emerald-400 font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                            />
                          </div>
                        )}
                      </div>

                      {/* Botón eliminar fila */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(rule.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/15 rounded transition-colors self-end sm:self-center cursor-pointer"
                        title="Eliminar regla"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Chips interactivos de variables detectadas (Ruta y Request Schema) */}
                    {!isToggleOrUnset && hasDetectedVariables && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/60">
                        <span className="text-[10px] text-muted-foreground">Insertar variable:</span>
                        {detectedPathParams.map((param) => (
                          <button
                            key={`path-${param}`}
                            type="button"
                            onClick={() =>
                              handleUpdateRule(rule.id, {
                                value: `{{path.${param}}}`,
                              })
                            }
                            className="px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 text-[10px] font-mono text-primary transition-colors cursor-pointer"
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
                            className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-mono text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                            title={`Usar campo de request body {{body.${field.path}}} (${field.valueType})`}
                          >
                            {`{{body.${field.path}}}`}
                            <span className="ml-1 text-[9px] text-emerald-600/70 dark:text-emerald-400/70">
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
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Vista previa JSON generada (stateUpdates enviado al backend):
                  </span>
                  <pre className="p-2 bg-background border border-border rounded-lg text-cyan-600 dark:text-cyan-400 font-mono text-[11px] overflow-x-auto max-h-24">
                    {serializedPreview}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6ª FILA: SIMULACIÓN DE RED & CAOS */}
        <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Flame className="h-4 w-4 text-amber-500" />
            <span>Simulación de Red & Caos Inyectado</span>
          </div>

          {/* Perfiles de Red Predefinidos */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
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
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary font-semibold'
                        : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'
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
            <div className="flex justify-between text-xs text-foreground">
              <span>Latencia Simulada</span>
              <span className="font-mono text-primary font-semibold">{delayMs} ms</span>
            </div>
            <input
              type="range"
              min="0"
              max="3000"
              step="50"
              value={delayMs}
              onChange={(e) => handleCustomDelayChange(Number(e.target.value))}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Slider de Tasa de Fallo (Error Rate) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-foreground">
              <span>Tasa de Error Inyectada (Caos)</span>
              <span
                className={`font-mono font-semibold ${
                  errorRate > 0 ? 'text-destructive' : 'text-muted-foreground'
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
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-destructive"
            />
          </div>

          {/* Selector de HTTP de fallo cuando errorRate > 0 */}
          {errorRate > 0 && (
            <div className="space-y-1">
              <label htmlFor="failure-code-select" className="text-xs text-foreground">
                Código de Estado en Fallo
              </label>
              <select
                id="failure-code-select"
                value={failureStatusCode}
                onChange={(e) => setFailureStatusCode(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-lg p-2 text-xs text-destructive font-mono focus:outline-none focus:border-destructive"
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

        {/* 7ª FILA: Cuerpo de la Respuesta (JSON) */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor={responseBodyId} className="text-xs font-medium text-foreground">
              Cuerpo de la Respuesta (JSON)
            </label>
            {bodyError && <span className="text-xs text-destructive">{bodyError}</span>}
          </div>
          <textarea
            id={responseBodyId}
            rows={5}
            value={responseBody}
            onChange={(e) => handleBodyChange(e.target.value)}
            className="w-full font-mono text-xs bg-background border border-border rounded-lg p-3 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary"
            required
          />
        </div>

        {/* Sección Avanzada Opcional (Cabeceras) */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline transition-colors cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>{showAdvanced ? 'Ocultar Opciones Avanzadas' : 'Ver Opciones Avanzadas (Cabeceras HTTP)'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-muted/30 border border-border rounded-xl space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={responseHeadersId} className="text-xs font-medium text-foreground flex items-center gap-1">
                    <span>Cabeceras de Respuesta Personalizadas (JSON)</span>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </label>
                  {headersError && <span className="text-xs text-destructive">{headersError}</span>}
                </div>
                <textarea
                  id={responseHeadersId}
                  rows={2}
                  value={responseHeaders}
                  onChange={(e) => handleHeadersChange(e.target.value)}
                  placeholder={'{\n  "X-Custom-Header": "value"\n}'}
                  className="w-full font-mono text-xs bg-background border border-border rounded-lg p-2 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Acciones del formulario */}
        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-secondary hover:bg-muted text-xs text-secondary-foreground rounded-lg transition-colors border border-border/50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !!bodyError || !!headersError}
            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs font-semibold text-primary-foreground rounded-lg transition-colors shadow-sm cursor-pointer"
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
