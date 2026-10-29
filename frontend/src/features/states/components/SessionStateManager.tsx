import { useState, useId } from 'react';
import { useStates } from '../hooks/use-states';
import type { ScenarioState } from '../api/states-api';
import { useAuthStore } from '@/stores/use-auth-store';
import {
  Database,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  FileCode2,
} from 'lucide-react';

interface SessionStateManagerProps {
  selectedSessionKey: string;
  onSelectSessionKey: (sessionKey: string) => void;
}

function formatPrettyJson(raw?: string): string {
  if (!raw || !raw.trim()) return '{}';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function SessionStateManager({
  selectedSessionKey,
  onSelectSessionKey,
}: SessionStateManagerProps) {
  const {
    states,
    isLoading,
    createState,
    updateState,
    deleteState,
    resetState,
    isUpdating,
    isCreating,
    isDeleting,
    isResetting,
  } = useStates();

  const user = useAuthStore((state) => state.user);
  const isGuest = user?.role === 'ROLE_GUEST';

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionJson, setNewSessionJson] = useState('{\n  "theme": "dark",\n  "count": 0\n}');
  const [newSessionError, setNewSessionError] = useState<string | null>(null);

  const newSessionNameId = useId();
  const newSessionJsonId = useId();

  // Local JSON buffer for editing (tracks baseServerJson to detect external mutations from mock executions)
  const [editJsonState, setEditJsonState] = useState<{
    [sessionKey: string]: { draft: string; baseServerJson: string };
  }>({});
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Active state object
  const activeState: ScenarioState | undefined =
    states.find((s) => s.sessionKey === selectedSessionKey) ?? states[0];

  const activeSessionEntry = activeState ? editJsonState[activeState.sessionKey] : undefined;
  const hasUnsavedLocalDraft =
    activeState !== undefined &&
    activeSessionEntry !== undefined &&
    activeSessionEntry.baseServerJson === activeState.stateJson;

  const currentJsonValue = hasUnsavedLocalDraft
    ? activeSessionEntry.draft
    : formatPrettyJson(activeState?.stateJson);

  const handleCopyKey = (key: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleJsonChange = (val: string) => {
    if (!activeState) return;
    setEditJsonState((prev) => ({
      ...prev,
      [activeState.sessionKey]: {
        draft: val,
        baseServerJson: activeState.stateJson,
      },
    }));
    try {
      JSON.parse(val);
      setJsonValidationError(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'JSON inválido';
      setJsonValidationError(`Error de sintaxis: ${message}`);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(currentJsonValue);
      const formatted = JSON.stringify(parsed, null, 2);
      if (activeState) {
        setEditJsonState((prev) => ({
          ...prev,
          [activeState.sessionKey]: {
            draft: formatted,
            baseServerJson: activeState.stateJson,
          },
        }));
      }
      setJsonValidationError(null);
    } catch {
      setJsonValidationError('No se puede formatear: el JSON no es válido');
    }
  };

  const handleSaveJson = async () => {
    if (!activeState || activeState.system || jsonValidationError) return;
    try {
      // Validate it's parsed correctly
      JSON.parse(currentJsonValue);
      await updateState({
        id: activeState.id,
        payload: { stateJson: currentJsonValue },
      });
      setEditJsonState((prev) => {
        const next = { ...prev };
        delete next[activeState.sessionKey];
        return next;
      });
      setSaveSuccessMessage('¡Estado guardado correctamente!');
      setTimeout(() => setSaveSuccessMessage(null), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el estado';
      setJsonValidationError(message);
    }
  };

  const handleResetJson = async () => {
    if (!activeState) return;
    setJsonValidationError(null);

    try {
      await resetState(activeState.id);
      setEditJsonState((prev) => {
        const next = { ...prev };
        delete next[activeState.sessionKey];
        return next;
      });
      setSaveSuccessMessage('Estado restaurado a sus valores originales');
      setTimeout(() => setSaveSuccessMessage(null), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al restaurar el estado';
      setJsonValidationError(message);
    }
  };

  const handleCreateSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewSessionError(null);

    const trimmedName = newSessionName.trim();
    if (trimmedName.toLowerCase() === 'default') {
      setNewSessionError('El nombre "default" está reservado por el sistema');
      return;
    }

    if (!/^[a-zA-Z0-9_-]{2,50}$/.test(trimmedName)) {
      setNewSessionError(
        'El nombre debe tener entre 2 y 50 caracteres alfanuméricos, guiones (-) o guiones bajos (_)'
      );
      return;
    }

    try {
      JSON.parse(newSessionJson);
    } catch {
      setNewSessionError('El JSON inicial no tiene un formato válido');
      return;
    }

    try {
      const created = await createState({
        name: trimmedName,
        stateJson: newSessionJson,
      });
      setNewSessionName('');
      setNewSessionJson('{}');
      setIsCreateModalOpen(false);
      onSelectSessionKey(created.sessionKey);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } }; message?: string };
      setNewSessionError(
        errorObj.response?.data?.detail ?? errorObj.message ?? 'No se pudo crear la sesión'
      );
    }
  };

  const handleDeleteSession = async (stateToDelete: ScenarioState, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (stateToDelete.system) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la sesión "${stateToDelete.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    try {
      await deleteState(stateToDelete.id);
      // Si eliminamos la sesión activa, seleccionamos la sesión de sistema por defecto u otra restante
      if (stateToDelete.sessionKey === selectedSessionKey) {
        const fallback =
          states.find((s) => s.system && s.id !== stateToDelete.id)?.sessionKey ?? 'default';
        onSelectSessionKey(fallback);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } }; message?: string };
      alert(errorObj.response?.data?.detail ?? 'Error al eliminar la sesión');
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6 text-card-foreground">
      {/* Encabezado sin selector ni botón */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
            Gestor de Sesiones & Estado Aislado
          </h2>
          <p className="text-xs text-muted-foreground">
            Escenarios de pruebas 1:N aislados por usuario y persistidos en base de datos
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">Cargando sesiones de escenario...</div>
      ) : !activeState ? (
        <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
          No se encontró ninguna sesión activa. Crea una nueva sesión para comenzar.
        </div>
      ) : (
        /* Grid de Cards de Estado y Slots Vacíos */
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {states.map((s) => {
              const isSelected = s.sessionKey === activeState.sessionKey;
              return (
                <div
                  key={s.id}
                  onClick={() => onSelectSessionKey(s.sessionKey)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSessionKey(s.sessionKey);
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-xs select-none ${
                    isSelected
                      ? 'bg-card border-primary ring-2 ring-primary/25 shadow-md'
                      : 'bg-muted/30 hover:bg-muted/60 border-border hover:border-border/80'
                  }`}
                  data-testid={`session-card-${s.sessionKey}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-foreground truncate block text-xs" title={s.name}>
                        {s.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono truncate block">
                        {s.sessionKey}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                        s.system
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-800'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800'
                      }`}
                    >
                      {s.system ? (
                        <>
                          <Sparkles className="h-2.5 w-2.5" />
                          Sistema
                        </>
                      ) : (
                        'Custom'
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-auto">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      X-Session-ID
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleCopyKey(s.sessionKey, e)}
                        className="p-1 hover:text-foreground text-muted-foreground rounded transition-colors cursor-pointer"
                        title="Copiar Session Key"
                        aria-label={`Copiar clave de ${s.name}`}
                      >
                        {copiedKey === s.sessionKey ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {!s.system && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(s, e)}
                          disabled={isDeleting}
                          className="p-1 hover:text-destructive text-muted-foreground rounded transition-colors cursor-pointer"
                          title="Eliminar sesión"
                          aria-label={`Eliminar sesión ${s.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Slots vacíos disponibles para usuarios no invitados (hasta 5 slots en total) */}
            {!isGuest &&
              Array.from({ length: Math.max(0, 5 - states.length) }).map((_, idx) => (
                <div
                  key={`empty-slot-${idx}`}
                  className="p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/15 flex flex-col items-center justify-center gap-2 min-h-[96px] text-center"
                >
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Slot disponible ({states.length + idx + 1}/5)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer border border-primary/20"
                    title="Crear nueva sesión en este slot"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Crear estado</span>
                  </button>
                </div>
              ))}
          </div>

          {/* Editor de JSON del Estado Seleccionado */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <label htmlFor="state-json-editor" className="text-xs font-medium text-foreground">
                  Variables de Estado — <strong className="font-mono text-primary">{activeState.name}</strong> ({activeState.sessionKey})
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFormatJson}
                  className="px-2.5 py-1 bg-secondary hover:bg-muted text-[11px] text-secondary-foreground rounded border border-border transition-colors cursor-pointer"
                >
                  Formatear JSON
                </button>
                <button
                  type="button"
                  onClick={handleResetJson}
                  disabled={isUpdating || isResetting}
                  className="flex items-center gap-1 px-2.5 py-1 bg-secondary hover:bg-muted text-[11px] text-secondary-foreground rounded border border-border transition-colors cursor-pointer"
                  title="Restaurar el estado a sus valores originales guardados"
                >
                  <RotateCcw className="h-3 w-3 text-muted-foreground" />
                  Restaurar original
                </button>
              </div>
            </div>

            <textarea
              id="state-json-editor"
              rows={7}
              value={currentJsonValue}
              onChange={(e) => handleJsonChange(e.target.value)}
              disabled={activeState.system}
              className={`w-full font-mono text-xs bg-background border rounded-xl p-3 text-emerald-600 dark:text-emerald-400 focus:outline-none transition-colors ${
                jsonValidationError
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              } ${activeState.system ? 'opacity-80 cursor-not-allowed' : ''}`}
              placeholder="{}"
            />

            {jsonValidationError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{jsonValidationError}</span>
              </div>
            )}

            {saveSuccessMessage && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            {activeState.system ? (
              <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border rounded-lg text-xs text-muted-foreground">
                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  El estado por defecto del sistema es de solo lectura. Para guardar variables de estado
                  personalizadas, crea una sesión personalizada con el botón «Nueva Sesión».
                </span>
              </div>
            ) : (
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSaveJson}
                  disabled={isUpdating || !!jsonValidationError}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs font-semibold text-primary-foreground rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isUpdating ? 'Guardando...' : 'Guardar Estado'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de creación de nueva sesión */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-card-foreground">
            <h3 className="text-base font-bold text-foreground">Crear Nueva Sesión de Escenario</h3>
            <p className="text-xs text-muted-foreground">
              Cada sesión tiene su propio almacén de estado aislado accesible vía el encabezado{' '}
              <code className="text-primary font-mono">X-Session-ID</code>.
            </p>

            {newSessionError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-lg">
                {newSessionError}
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label htmlFor={newSessionNameId} className="text-xs font-medium text-foreground">
                  Nombre de la Sesión
                </label>
                <input
                  id={newSessionNameId}
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="ej. checkout_flow o test_user_01"
                  className="w-full mt-1 bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono placeholder:text-muted-foreground"
                  required
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Solo letras, números, guiones (-) y guiones bajos (_). Mín. 2 caracteres.
                </span>
              </div>

              <div>
                <label htmlFor={newSessionJsonId} className="text-xs font-medium text-foreground">
                  Estado Inicial (JSON)
                </label>
                <textarea
                  id={newSessionJsonId}
                  rows={5}
                  value={newSessionJson}
                  onChange={(e) => setNewSessionJson(e.target.value)}
                  className="w-full mt-1 font-mono text-xs bg-background border border-border rounded-lg p-2.5 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setNewSessionError(null);
                  }}
                  className="px-3.5 py-2 bg-secondary hover:bg-muted text-xs text-secondary-foreground rounded-lg transition-colors border border-border cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs font-semibold text-primary-foreground rounded-lg transition-colors cursor-pointer"
                >
                  {isCreating ? 'Creando...' : 'Crear Sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
