import { useState } from 'react';
import { RotateCcw, Database } from 'lucide-react';

export function SessionStateInspector() {
  const [sessionKey, setSessionKey] = useState('user_sandbox_01');
  const [currentStateJson, setCurrentStateJson] = useState('{\n  "isLoggedIn": true,\n  "itemsInCart": 3,\n  "balance": 850.00\n}');

  const handleResetState = () => {
    // Llamada a DELETE /api/v1/admin/states/{sessionKey}
    setCurrentStateJson('{}');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Estado de la Sesión Actual</h3>
        </div>
        <button
          onClick={handleResetState}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition-colors border border-slate-700"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
          Reiniciar Estado
        </button>
      </div>

      <div>
        <label className="text-xs text-slate-400">Sesión Activa (`X-Session-ID`)</label>
        <input
          type="text"
          value={sessionKey}
          onChange={(e) => setSessionKey(e.target.value)}
          className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-indigo-300"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400">Contenido del Estado en PostgreSQL / Redis</label>
        <pre className="mt-1 p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-emerald-400 overflow-x-auto">
          {currentStateJson}
        </pre>
      </div>
    </div>
  );
}
