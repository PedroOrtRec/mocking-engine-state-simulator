import { useState, useId } from 'react';
import { useStates } from '../hooks/use-states';
import type { ScenarioState } from '../api/states-api';
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

  const [copiedKey, setCopiedKey] = useState(false);
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

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
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

  const handleDeleteSession = async () => {
    if (!activeState || activeState.system) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la sesión "${activeState.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    try {
      await deleteState(activeState.id);
      // Fall back to default or first remaining state
      const fallback = states.find((s) => s.system)?.sessionKey ?? 'default';
      onSelectSessionKey(fallback);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } }; message?: string };
      alert(errorObj.response?.data?.detail ?? 'Error al eliminar la sesión');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Encabezado y Selector de Sesiones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800 text-indigo-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Gestor de Sesiones & Estado Aislado
            </h2>
            <p className="text-xs text-slate-400">
              Escenarios de pruebas 1:N aislados por usuario y persistidos en base de datos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de Sesiones disponibles */}
          <div className="relative">
            <label htmlFor="session-select" className="sr-only">Seleccionar Sesión</label>
            <select
              id="session-select"
              aria-label="Seleccionar Sesión"
              value={activeState?.sessionKey ?? selectedSessionKey}
              onChange={(e) => onSelectSessionKey(e.target.value)}
              disabled={isLoading || states.length === 0}
              className="bg-slate-950 border border-slate-800 text-white text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {states.map((s) => (
                <option key={s.id} value={s.sessionKey}>
                  {s.system ? `[Sistema] ${s.name}` : `[Custom] ${s.name}`} ({s.sessionKey})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva Sesión
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400">Cargando sesiones de escenario...</div>
      ) : !activeState ? (
        <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No se encontró ninguna sesión activa. Crea una nueva sesión para comenzar.
        </div>
      ) : (
        /* Card con el Estado de la Sesión Seleccionada */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">{activeState.name}</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                    activeState.system
                      ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                      : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  }`}
                >
                  {activeState.system ? (
                    <>
                      <Sparkles className="h-2.5 w-2.5" />
                      Sistema (Default)
                    </>
                  ) : (
                    'Personalizada'
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-mono">X-Session-ID:</span>
                <code className="text-indigo-400 font-mono font-medium px-1.5 py-0.5 bg-indigo-950/40 rounded border border-indigo-900/40">
                  {activeState.sessionKey}
                </code>
                <button
                  onClick={() => handleCopyKey(activeState.sessionKey)}
                  className="p-1 hover:text-white text-slate-400 transition-colors"
                  title="Copiar Session Key"
                >
                  {copiedKey ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!activeState.system && (
                <button
                  onClick={handleDeleteSession}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-xs text-rose-300 rounded-lg transition-colors"
                  title="Eliminar esta sesión personalizada"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              )}
              {activeState.system && (
                <span className="text-[11px] text-slate-500 italic">
                  Sesión base del sistema protegida
                </span>
              )}
            </div>
          </div>

          {/* Editor de JSON del Estado */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-emerald-400" />
                <label htmlFor="state-json-editor" className="text-xs font-medium text-slate-300">
                  Variables de Estado (JSON)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFormatJson}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded border border-slate-700 transition-colors"
                >
                  Formatear JSON
                </button>
                <button
                  type="button"
                  onClick={handleResetJson}
                  disabled={isUpdating || isResetting}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded border border-slate-700 transition-colors"
                  title="Restaurar el estado a sus valores originales guardados"
                >
                  <RotateCcw className="h-3 w-3 text-slate-400" />
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
              className={`w-full font-mono text-xs bg-slate-950 border rounded-xl p-3 text-emerald-400 focus:outline-none transition-colors ${
                jsonValidationError
                  ? 'border-rose-500/80 focus:border-rose-500'
                  : 'border-slate-800 focus:border-indigo-500'
              } ${activeState.system ? 'opacity-80 cursor-not-allowed' : ''}`}
              placeholder="{}"
            />

            {jsonValidationError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{jsonValidationError}</span>
              </div>
            )}

            {saveSuccessMessage && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            {activeState.system ? (
              <div className="flex items-center gap-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400">
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
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
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white rounded-lg transition-colors shadow-sm"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Crear Nueva Sesión de Escenario</h3>
            <p className="text-xs text-slate-400">
              Cada sesión tiene su propio almacén de estado aislado accesible vía el encabezado{' '}
              <code className="text-indigo-400 font-mono">X-Session-ID</code>.
            </p>

            {newSessionError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-lg">
                {newSessionError}
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label htmlFor={newSessionNameId} className="text-xs font-medium text-slate-300">
                  Nombre de la Sesión
                </label>
                <input
                  id={newSessionNameId}
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="ej. checkout_flow o test_user_01"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Solo letras, números, guiones (-) y guiones bajos (_). Mín. 2 caracteres.
                </span>
              </div>

              <div>
                <label htmlFor={newSessionJsonId} className="text-xs font-medium text-slate-300">
                  Estado Inicial (JSON)
                </label>
                <textarea
                  id={newSessionJsonId}
                  rows={5}
                  value={newSessionJson}
                  onChange={(e) => setNewSessionJson(e.target.value)}
                  className="w-full mt-1 font-mono text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-emerald-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setNewSessionError(null);
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white rounded-lg transition-colors"
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
