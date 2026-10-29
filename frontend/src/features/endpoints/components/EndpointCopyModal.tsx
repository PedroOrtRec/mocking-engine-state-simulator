import { useState, useId } from 'react';
import type { MockEndpoint } from '../api/endpoints-api';
import {
  extractPathParams,
  parseJsonToSchemaRules,
  getInitialValueForSchemaField,
  buildCurlRequestCommand,
  type SchemaFieldRule,
} from '../utils/mutation-rules';
import { HttpMethodBadge } from './HttpMethodBadge';
import { Copy, Check, Terminal, ShieldCheck, Route, KeyRound, AlertCircle } from 'lucide-react';

interface EndpointCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoint: MockEndpoint | null;
  activeSessionKey?: string;
}

export function EndpointCopyModal({
  isOpen,
  onClose,
  endpoint,
  activeSessionKey = 'default',
}: EndpointCopyModalProps) {
  if (!isOpen || !endpoint) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8 text-card-foreground">
        <EndpointCopyFormContent
          key={`copy-${endpoint.id}-${activeSessionKey}`}
          endpoint={endpoint}
          activeSessionKey={activeSessionKey}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

interface ContentProps {
  endpoint: MockEndpoint;
  activeSessionKey: string;
  onClose: () => void;
}

function formatConstraintBadges(field: SchemaFieldRule): string[] {
  const badges: string[] = [];
  if (field.minimum !== undefined && field.minimum !== '') badges.push(`min: ${field.minimum}`);
  if (field.maximum !== undefined && field.maximum !== '') badges.push(`max: ${field.maximum}`);
  if (field.minLength !== undefined && field.minLength !== '')
    badges.push(`minLen: ${field.minLength}`);
  if (field.maxLength !== undefined && field.maxLength !== '')
    badges.push(`maxLen: ${field.maxLength}`);
  if (field.format) badges.push(`format: ${field.format}`);
  if (field.pattern) badges.push(`regex: ${field.pattern}`);
  return badges;
}

function EndpointCopyFormContent({ endpoint, activeSessionKey, onClose }: ContentProps) {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const pathParams = extractPathParams(endpoint.pathPattern);
  const schemaRules = parseJsonToSchemaRules(endpoint.requestSchema);

  const [sessionKey, setSessionKey] = useState(activeSessionKey || 'default');
  const [pathValues, setPathValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of pathParams) {
      initial[p] = '1';
    }
    return initial;
  });

  const [bodyValues, setBodyValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of schemaRules) {
      initial[field.name] = getInitialValueForSchemaField(field);
    }
    return initial;
  });

  const [customBodyJson, setCustomBodyJson] = useState('');
  const [copied, setCopied] = useState(false);

  const sessionInputId = useId();
  const customBodyInputId = useId();

  const supportsCustomBody =
    schemaRules.length === 0 &&
    (endpoint.httpMethod === 'POST' ||
      endpoint.httpMethod === 'PUT' ||
      endpoint.httpMethod === 'PATCH');

  const builderResult = buildCurlRequestCommand({
    baseUrl,
    httpMethod: endpoint.httpMethod,
    pathPattern: endpoint.pathPattern,
    sessionKey,
    pathValues,
    schemaRules,
    bodyValues,
    customBodyJson: supportsCustomBody ? customBodyJson : undefined,
  });

  const handleCopy = async () => {
    if (!builderResult.isValid) return;
    await navigator.clipboard.writeText(builderResult.curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-start justify-between pb-3 border-b border-border gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Construir y Copiar Petición cURL</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Completa los parámetros de ruta y el body validado contra el esquema de{' '}
            <span className="text-foreground font-semibold">{endpoint.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HttpMethodBadge method={endpoint.httpMethod} />
          <span className="font-mono text-xs text-foreground bg-muted border border-border px-2 py-0.5 rounded">
            /mock{endpoint.pathPattern.startsWith('/') ? endpoint.pathPattern : `/${endpoint.pathPattern}`}
          </span>
        </div>
      </div>

      {/* 1. Cabecera X-Session-ID */}
      <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-2">
        <label
          htmlFor={sessionInputId}
          className="text-xs font-bold text-primary flex items-center gap-1.5"
        >
          <KeyRound className="h-3.5 w-3.5 text-primary" />
          <span>Contexto de Sesión (Header X-Session-ID)</span>
        </label>
        <input
          id={sessionInputId}
          type="text"
          value={sessionKey}
          onChange={(e) => setSessionKey(e.target.value)}
          placeholder="default"
          className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
        />
      </div>

      {/* 2. Parámetros de Ruta {param} */}
      {pathParams.length > 0 && (
        <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Route className="h-3.5 w-3.5 text-primary" />
              <span>Parámetros de Ruta Requeridos</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              Ruta resuelta: <strong className="text-primary font-medium">/mock{builderResult.resolvedPath}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pathParams.map((param) => {
              const err = builderResult.errors[`path.${param}`];
              return (
                <div key={param} className="space-y-1">
                  <label
                    htmlFor={`copy-path-${param}`}
                    className="text-xs font-mono text-foreground flex items-center justify-between"
                  >
                    <span>{`{${param}}`}</span>
                    <span className="text-[10px] text-destructive font-sans">Obligatorio</span>
                  </label>
                  <input
                    id={`copy-path-${param}`}
                    type="text"
                    value={pathValues[param] ?? ''}
                    onChange={(e) =>
                      setPathValues((prev) => ({ ...prev, [param]: e.target.value }))
                    }
                    placeholder={`Valor para ${param}`}
                    className={`w-full bg-background border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none ${
                      err
                        ? 'border-destructive focus:border-destructive'
                        : 'border-border focus:border-primary'
                    }`}
                  />
                  {err && (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{err}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Constructor asistido del Body según JSON Schema */}
      {schemaRules.length > 0 && (
        <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Campos del Body de la Petición (Validados contra JSON Schema)</span>
          </div>

          <div className="space-y-2.5">
            {schemaRules.map((field) => {
              const err = builderResult.errors[`body.${field.name}`];
              const val = bodyValues[field.name] ?? '';
              const enumOptions =
                field.type === 'string' && field.enumValues
                  ? field.enumValues
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s !== '')
                  : [];
              const badges = formatConstraintBadges(field);

              return (
                <div
                  key={field.id}
                  className="p-2.5 bg-card border border-border rounded-lg space-y-1.5"
                >
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label
                      htmlFor={`copy-body-${field.name}`}
                      className="text-xs font-mono font-semibold text-foreground flex items-center gap-1.5"
                    >
                      <span>{field.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                        {field.type}
                      </span>
                      {field.required ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-700 dark:text-rose-300 font-sans font-normal">
                          Obligatorio
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-sans font-normal">
                          Opcional
                        </span>
                      )}
                    </label>

                    {badges.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {badges.map((b) => (
                          <span
                            key={b}
                            className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Input según tipo */}
                  {enumOptions.length > 0 ? (
                    <select
                      id={`copy-body-${field.name}`}
                      value={val}
                      onChange={(e) =>
                        setBodyValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                      }
                      className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                    >
                      {!field.required && <option value="">-- Omitir campo opcional --</option>}
                      {enumOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <select
                      id={`copy-body-${field.name}`}
                      value={val}
                      onChange={(e) =>
                        setBodyValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                      }
                      className="w-full bg-background border border-border rounded px-2.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono focus:outline-none focus:border-primary"
                    >
                      {!field.required && <option value="">-- Omitir campo opcional --</option>}
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      id={`copy-body-${field.name}`}
                      type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'}
                      step={field.type === 'integer' ? '1' : 'any'}
                      value={val}
                      onChange={(e) =>
                        setBodyValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                      }
                      placeholder={
                        field.type === 'object'
                          ? '{"clave": "valor"}'
                          : field.type === 'array'
                          ? '["item1"]'
                          : `Valor para ${field.name}`
                      }
                      className={`w-full bg-background border rounded px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none ${
                        err
                          ? 'border-destructive focus:border-destructive'
                          : 'border-border focus:border-primary'
                      }`}
                    />
                  )}

                  {err && (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{err}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3b. Body JSON libre opcional solo cuando el método soporta body pero el endpoint no tiene JSON Schema */}
      {supportsCustomBody && (
        <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor={customBodyInputId} className="text-xs font-medium text-foreground">
              Body JSON de la Petición (Opcional — este endpoint no exige esquema de validación)
            </label>
            {builderResult.errors['customBody'] && (
              <span className="text-xs text-destructive">{builderResult.errors['customBody']}</span>
            )}
          </div>
          <textarea
            id={customBodyInputId}
            rows={3}
            value={customBodyJson}
            onChange={(e) => setCustomBodyJson(e.target.value)}
            placeholder={'{\n  "ejemplo": "valor"\n}'}
            className="w-full font-mono text-xs bg-background border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      )}

      {/* 4. Vista previa en vivo del comando cURL */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">
            Vista Previa del Comando cURL Generado
          </span>
          {builderResult.isValid ? (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Petición válida según esquema
            </span>
          ) : (
            <span className="text-[11px] text-destructive font-medium">
              Corrige los errores señalados para copiar
            </span>
          )}
        </div>
        <pre className="p-3 bg-muted/50 border border-border rounded-xl text-primary font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
          {builderResult.curlCommand}
        </pre>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-3 border-t border-border">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-secondary hover:bg-muted text-xs text-secondary-foreground rounded-lg transition-colors border border-border/50 cursor-pointer"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!builderResult.isValid}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs font-semibold text-primary-foreground rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-300" />
              <span>¡Comando Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copiar cURL al Portapapeles</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
