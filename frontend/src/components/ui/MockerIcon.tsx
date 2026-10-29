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

  // IDs con scope único para evitar colisiones en el DOM
  const glowId = `glow-${id}`;
  const mGradId = `m-grad-${id}`;
  const rectBackGradId = `rect-back-grad-${id}`;
  const rectFrontGradId = `rect-front-grad-${id}`;
  const rectBackFillId = `rect-back-fill-${id}`;
  const rectFrontFillId = `rect-front-fill-${id}`;

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
        {/* Filtro de resplandor neón difuso */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradiente principal de la M transversal (Violeta -> Cian eléctrico -> Menta neón) */}
        <linearGradient id={mGradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7000ff" />
          <stop offset="50%" stopColor="#00d2ff" />
          <stop offset="100%" stopColor="#00ffa3" />
        </linearGradient>

        {/* Gradiente del contorno del rectángulo posterior (Cian profundo a azul) */}
        <linearGradient id={rectBackGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#4facfe" stopOpacity="0.4" />
        </linearGradient>

        {/* Gradiente del contorno del rectángulo frontal (Azul a púrpura) */}
        <linearGradient id={rectFrontGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4facfe" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#7f00ff" stopOpacity="0.6" />
        </linearGradient>

        {/* Relleno translúcido para el plano posterior */}
        <linearGradient id={rectBackFillId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#4facfe" stopOpacity="0.02" />
        </linearGradient>

        {/* Relleno translúcido para el plano frontal */}
        <linearGradient id={rectFrontFillId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4facfe" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#7f00ff" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Fondo base delimitador */}
      <rect width="100%" height="100%" fill="transparent" rx="30" />

      <g filter={`url(#${glowId})`}>
        {/* 
          1. Rectángulo Posterior en Perspectiva (Plano de Estado / Mock State)
          Inclinación isométrica oblicua con esquinas suavizadas
        */}
        <path
          d="
            M 160, 108
            L 300, 82
            C 308, 80.5 314, 85 312, 93
            L 292, 271
            C 291, 277 285, 281 278, 282
            L 138, 308
            C 130, 309.5 124, 305 126, 297
            L 146, 119
            C 147, 113 153, 109 160, 108
            Z
          "
          fill={`url(#${rectBackFillId})`}
          stroke={`url(#${rectBackGradId})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 
          2. Rectángulo Frontal Superpuesto en Perspectiva (Plano de Simulación / Engine)
          Desplazado en profundidad hacia abajo a la derecha
        */}
        <path
          d="
            M 220, 168
            L 360, 142
            C 368, 140.5 374, 145 372, 153
            L 352, 331
            C 351, 337 345, 341 338, 342
            L 198, 368
            C 190, 369.5 184, 365 186, 357
            L 206, 179
            C 207, 173 213, 169 220, 168
            Z
          "
          fill={`url(#${rectFrontFillId})`}
          stroke={`url(#${rectFrontGradId})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 
          3. 'M' Mayúscula Transversal (Trazo de Fuerza / Mocking Engine)
          Atraviesa ambos planos de izquierda a derecha con alta energía y presencia
        */}
        <path
          d="
            M 115, 345
            L 195, 145
            L 255, 275
            L 315, 135
            L 395, 335
          "
          fill="none"
          stroke={`url(#${mGradId})`}
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
