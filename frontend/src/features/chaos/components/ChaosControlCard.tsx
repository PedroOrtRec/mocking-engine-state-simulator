import { useState } from 'react';
import { Wifi, Signal, AlertTriangle, type LucideIcon } from 'lucide-react';

type NetworkProfileId = 'none' | 'wifi' | '4g' | 'fast-3g' | 'slow-3g' | 'custom';

interface NetworkProfile {
  readonly id: Exclude<NetworkProfileId, 'custom'>;
  readonly name: string;
  readonly delayMs: number;
  readonly icon: LucideIcon;
}

const PROFILES: readonly NetworkProfile[] = [
  { id: 'none', name: 'Sin Latencia', delayMs: 0, icon: Wifi },
  { id: 'wifi', name: 'WiFi Rápido', delayMs: 20, icon: Wifi },
  { id: '4g', name: 'Móvil 4G', delayMs: 60, icon: Signal },
  { id: 'fast-3g', name: 'Fast 3G', delayMs: 250, icon: Signal },
  { id: 'slow-3g', name: 'Slow 3G', delayMs: 600, icon: AlertTriangle },
];

export function ChaosControlCard() {
  const [selectedProfileId, setSelectedProfileId] = useState<NetworkProfileId>('none');
  const [customDelay, setCustomDelay] = useState<number>(0);
  const [errorRate, setErrorRate] = useState<number>(0);
  const [failureStatusCode, setFailureStatusCode] = useState<number>(500);

  const handleSelectProfile = (profile: NetworkProfile) => {
    setSelectedProfileId(profile.id);
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
            const isSelected = selectedProfileId === p.id;
            return (
              <button
                key={p.id}
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
            setSelectedProfileId('custom');
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
