import { useId, type ComponentPropsWithoutRef } from 'react';

export interface MockerIconProps extends ComponentPropsWithoutRef<'svg'> {
  size?: number | string;
  title?: string;
  panelColor?: string;
  panelOpacity?: number;
  mColor?: string;
}

export function MockerIcon({
  size = 40,
  className,
  title = 'Mocking Engine Logo',
  panelColor = 'var(--color-mocker-panel, #2c636c)',
  panelOpacity = 0.52,
  mColor = 'var(--color-mocker-m, #1d2b2d)',
  ...props
}: MockerIconProps) {
  const id = useId();

  // IDs con scope único para evitar colisiones en el DOM
  const corteFondoId = `corte-fondo-${id}`;
  const corteMedioId = `corte-medio-${id}`;
  const corteFrenteId = `corte-frente-${id}`;
  const mPerspectivaId = `m-perspectiva-${id}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 250 250"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title}
      {...props}
    >
      <title>{title}</title>
      <defs>
        {/* Cortes diagonales para entrelazar la M en perspectiva entre los dos paneles */}
        <clipPath id={corteFondoId}>
          <polygon points="0,0 110,0 105,250 0,250" />
        </clipPath>

        <clipPath id={corteMedioId}>
          <polygon points="109,0 131,0 126,250 104,250" />
        </clipPath>

        <clipPath id={corteFrenteId}>
          <polygon points="130,0 250,0 250,250 125,250" />
        </clipPath>

        {/* 
          Geometría de la M en perspectiva:
          - Poste izquierdo (fondo): altura 59px, grosor 9px
          - Poste derecho (frente): altura 73px, grosor 13px
        */}
        <path
          id={mPerspectivaId}
          fill={mColor}
          d="
            M 85,143 
            L 85,84 
            C 85,80 90,78 93,81 
            L 124,115 
            L 155,92 
            C 159,89 165,91 165,97 
            L 165,170 
            C 165,174 152,174 152,170 
            L 152,109 
            L 127,128 
            C 124,130 121,130 120,127 
            L 94,99 
            L 94,143 
            C 94,147 85,147 85,143 
            Z
          "
        />
      </defs>

      {/* 1. PLANO TRASERO: Brazo izquierdo de la M */}
      <use href={`#${mPerspectivaId}`} clipPath={`url(#${corteFondoId})`} />

      {/* 2. RECTÁNGULO TRASERO */}
      <polygon
        points="15,45 205,15 205,175 15,205"
        fill={panelColor}
        fillOpacity={panelOpacity}
      />

      {/* 3. PLANO INTERMEDIO: Cruce central de la M entre ambos rectángulos */}
      <use href={`#${mPerspectivaId}`} clipPath={`url(#${corteMedioId})`} />

      {/* 4. RECTÁNGULO DELANTERO */}
      <polygon
        points="45,75 235,45 235,205 45,235"
        fill={panelColor}
        fillOpacity={panelOpacity}
      />

      {/* 5. PRIMER PLANO: Brazo derecho de la M */}
      <use href={`#${mPerspectivaId}`} clipPath={`url(#${corteFrenteId})`} />

    </svg>
  );
}
