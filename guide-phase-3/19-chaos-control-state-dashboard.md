# Módulo 19: Panel de Control de Caos y Simulador de Estados

En este módulo construirás los paneles interactivos de **Ingeniería del Caos (Chaos Engineering)** y el **Inspector de Máquinas de Estado por Sesión**, permitiendo a desarrolladores y QA simular condiciones de red inestables y probar aplicaciones frontend bajo estrés.

---

## 🎯 Objetivos de Aprendizaje

1. Crear componentes de control interactivo para **simulación de perfiles de red móvil** (WiFi, 4G, Fast 3G, Slow 3G) y retardos personalizados.
2. Desarrollar controles para **inyección de fallos probabilísticos** (tasa de error del 0 al 100% y código HTTP de fallo configurable: 500, 503, 504, 429).
3. Construir el **Inspector de Estados de Sesión**: visualización en tiempo real del JSON de estado asociado a la cabecera `X-Session-ID`.
4. Añadir una utilidad de **Reinicio Rápido de Estado** (*Reset Session State*) para volver al estado inicial en un clic.

---

## 1. Perfiles de Red y Sliders de Caos (`ChaosControlCard.tsx`)

En `frontend/src/features/chaos/components/ChaosControlCard.tsx`:

```tsx
import { useState } from 'react';
import { Wifi, Signal, AlertTriangle } from 'lucide-react';

interface NetworkProfile {
  name: string;
  delayMs: number;
  icon: any;
}

const PROFILES: NetworkProfile[] = [
  { name: 'Sin Latencia', delayMs: 0, icon: Wifi },
  { name: 'WiFi Rápido', delayMs: 20, icon: Wifi },
  { name: 'Móvil 4G', delayMs: 60, icon: Signal },
  { name: 'Fast 3G', delayMs: 250, icon: Signal },
  { name: 'Slow 3G', delayMs: 600, icon: AlertTriangle },
];

export function ChaosControlCard() {
  const [selectedProfile, setSelectedProfile] = useState<string>('Sin Latencia');
  const [customDelay, setCustomDelay] = useState<number>(0);
  const [errorRate, setErrorRate] = useState<number>(0);
  const [failureStatusCode, setFailureStatusCode] = useState<number>(500);

  const handleSelectProfile = (profile: NetworkProfile) => {
    setSelectedProfile(profile.name);
    setCustomDelay(profile.delayMs);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Simulación de Red & Caos</h3>
          <p className="text-xs text-slate-400">Inyecta latencia y fallos controlados en las respuestas</p>
        </div>
      </div>

      {/* Selector de perfiles de red móvil */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-300">Perfil de Red Predefinido</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PROFILES.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedProfile === p.name;
            return (
              <button
                key={p.name}
                onClick={() => handleSelectProfile(p)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slider de latencia personalizada */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-300">
          <span>Latencia Adicional Configurada</span>
          <span className="font-mono text-indigo-400 font-semibold">{customDelay} ms</span>
        </div>
        <input
          type="range"
          min="0"
          max="3000"
          step="50"
          value={customDelay}
          onChange={(e) => {
            setCustomDelay(Number(e.target.value));
            setSelectedProfile('Personalizado');
          }}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* Slider de tasa de error */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-300">
          <span>Tasa de Error Inyectada</span>
          <span className={`font-mono font-semibold ${errorRate > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
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

      {/* Código HTTP inyectado */}
      {errorRate > 0 && (
        <div className="space-y-2">
          <label className="text-xs text-slate-300">Código de Respuesta en Fallo</label>
          <select
            value={failureStatusCode}
            onChange={(e) => setFailureStatusCode(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-rose-300 font-mono"
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
  );
}
```

---

## 2. Inspector de Estados de Sesión (`SessionStateInspector.tsx`)

En `frontend/src/features/chaos/components/SessionStateInspector.tsx`:

```tsx
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
```

¡Avanza al módulo final **[Módulo 20: Monitor de Logs en Tiempo Real y Testing con Vitest](./20-monitor-logs-testing-vitest.md)**!
