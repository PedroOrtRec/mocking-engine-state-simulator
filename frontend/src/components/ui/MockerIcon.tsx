import { useId, type ComponentPropsWithoutRef } from 'react';

export interface MockerIconProps extends ComponentPropsWithoutRef<'svg'> {
  size?: number | string;
  title?: string;
}

export function MockerIcon({
  size = 40,
  className,
  title = 'Mocking Engine Logo',
  ...props
}: MockerIconProps) {
  const id = useId();
  const glowId = `neon-glow-${id}`;
  const cyberGradId = `cyber-gradient-${id}`;
  const neonAccentId = `neon-accent-${id}`;
  const dbFillId = `db-fill-${id}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
      {...props}
    >
      <title>{title}</title>
      <defs>
        {/* Filtro de resplandor neón */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradiente ciberpunk para la base de datos (cian -> azul -> púrpura) */}
        <linearGradient id={cyberGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="50%" stopColor="#4facfe" />
          <stop offset="100%" stopColor="#7f00ff" />
        </linearGradient>

        {/* Gradiente neón acentuado (violeta -> cian -> verde neón) */}
        <linearGradient id={neonAccentId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7000ff" />
          <stop offset="60%" stopColor="#00d2ff" />
          <stop offset="100%" stopColor="#00ffa3" />
        </linearGradient>

        {/* Gradiente vertical translúcido para el volumen de datos */}
        <linearGradient id={dbFillId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7f00ff" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Fondo delimitador */}
      <rect width="100%" height="100%" fill="transparent" rx="30" />

      <g filter={`url(#${glowId})`}>
        {/* Base de datos (estado / mocks) */}
        <g
          stroke={`url(#${cyberGradId})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={`url(#${dbFillId})`}
        >
          <path d="M 125,230 C 125,248 160,260 195,260 C 230,260 265,248 265,230 L 265,255 C 265,273 230,285 195,285 C 160,285 125,273 125,255 Z" />
          <path d="M 125,185 C 125,203 160,215 195,215 C 230,215 265,203 265,185 L 265,210 C 265,228 230,240 195,240 C 160,240 125,228 125,210 Z" />
          <ellipse cx="195" cy="155" rx="70" ry="25" />
        </g>

        {/* Terminal / conector API */}
        <g
          stroke={`url(#${neonAccentId})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <line x1="335" y1="135" x2="335" y2="155" strokeWidth="7" />
          <line x1="365" y1="135" x2="365" y2="155" strokeWidth="7" />
          <rect x="320" y="155" width="60" height="12" rx="10" fill="#0b1730" />
          <path d="M 335,197 L 335,212 C 335,220 340,225 350,225 C 360,225 365,220 365,212 L 365,197" fill="#0b1730" />
        </g>

        {/* 
          Trazo continuo principal:
          1. Arco circular envolvente de 270° (Sur -> Este -> Norte -> Oeste).
          2. Transición tangente en el cuadrante inferior izquierdo hacia la M.
          3. Circuito dinámico de la M conectando con el terminal de salida.
        */}
        <path
          d="
            M 250,380
            C 321.8,380 380,321.8 380,250
            C 380,178.2 321.8,120 250,120
            C 178.2,120 120,178.2 120,250
            C 120,300 105,345 155,355
            C 185,360 210,330 225,230
            C 225,185 242,275 250,285
            C 258,275 275,185 275,195
            C 275,230 280,335 320,335
            C 350,335 375,295 375,245
            L 375,230
            C 375,225 365,225 350,225
          "
          fill="none"
          stroke={`url(#${neonAccentId})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
