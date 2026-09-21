'use client';

import React from 'react';
import { ExtinguisherType } from '@/types/fireProtection';

export type FireClass = 'A' | 'B' | 'C' | 'D' | 'K';

interface ExtinguisherClassIconProps {
  fireClass?: FireClass;
  agentType?: ExtinguisherType;
  size?: number; // Size in px (e.g. 28, 36, 48, 64, 80)
  className?: string;
  selected?: boolean;
  disabled?: boolean;
  showSubLabel?: boolean;
}

export const CLASS_CONFIG: Record<
  FireClass,
  {
    bgHex: string;
    textHex: string;
    strokeHex: string;
    letter: string;
    title: string;
    subtitle: string;
  }
> = {
  A: {
    bgHex: '#2E7D32', // Verde Seguridad
    textHex: '#FFFFFF',
    strokeHex: '#FFFFFF',
    letter: 'A',
    title: 'Clase A',
    subtitle: 'Combustibles Sólidos',
  },
  B: {
    bgHex: '#C62828', // Rojo Seguridad
    textHex: '#FFFFFF',
    strokeHex: '#FFFFFF',
    letter: 'B',
    title: 'Clase B',
    subtitle: 'Líquidos Inflamables',
  },
  C: {
    bgHex: '#1565C0', // Azul Seguridad
    textHex: '#FFFFFF',
    strokeHex: '#FFFFFF',
    letter: 'C',
    title: 'Clase C',
    subtitle: 'Equipos Eléctricos',
  },
  D: {
    bgHex: '#F9A825', // Amarillo Seguridad (Alto contraste negro)
    textHex: '#212121',
    strokeHex: '#212121',
    letter: 'D',
    title: 'Clase D',
    subtitle: 'Metales Combustibles',
  },
  K: {
    bgHex: '#212121', // Negro
    textHex: '#FFFFFF',
    strokeHex: '#FFFFFF',
    letter: 'K',
    title: 'Clase K',
    subtitle: 'Grasas y Aceites de Cocina',
  },
};

/**
 * Maps commercial extinguisher types to primary NOM fire class
 */
export function getFireClassForAgent(type: ExtinguisherType): FireClass {
  switch (type) {
    case 'WATER_PRESSURIZED':
      return 'A';
    case 'AFFF':
      return 'A';
    case 'CO2':
      return 'B';
    case 'CLEAN_AGENT':
      return 'C';
    case 'CLASS_K':
      return 'K';
    case 'PQS_ABC':
    default:
      return 'B';
  }
}

export function ExtinguisherClassIcon({
  fireClass,
  agentType,
  size = 48,
  className = '',
  selected = false,
  disabled = false,
  showSubLabel = false,
}: ExtinguisherClassIconProps) {
  const targetClass: FireClass = fireClass || (agentType ? getFireClassForAgent(agentType) : 'B');
  const config = CLASS_CONFIG[targetClass];

  const mainLetter =
    agentType === 'PQS_ABC'
      ? 'ABC'
      : agentType === 'CLEAN_AGENT'
      ? 'C'
      : agentType === 'AFFF'
      ? 'AB'
      : config.letter;

  return (
    <div
      className={`inline-flex flex-col items-center justify-center transition-all duration-200 ${
        disabled ? 'opacity-40 grayscale pointer-events-none' : ''
      } ${className}`}
      style={{ width: `${size}px`, height: showSubLabel ? 'auto' : `${size}px` }}
    >
      <div className="relative flex items-center justify-center w-full h-full">
        <svg
          viewBox="0 0 100 100"
          className={`w-full h-full drop-shadow-md transition-transform duration-200 ${
            selected ? 'scale-105 ring-4 ring-offset-2 ring-orange-500 rounded-full shadow-xl' : ''
          }`}
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          {/* Círculo de fondo con borde sutil blanco */}
          <circle cx="50" cy="50" r="47" fill={config.bgHex} stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="44" fill="none" stroke={config.strokeHex} strokeWidth="1" strokeOpacity="0.3" />

          {/* Letra Central Bold */}
          <text
            x="50"
            y={mainLetter.length > 2 ? '44' : '48'}
            fill={config.textHex}
            fontSize={mainLetter.length > 2 ? '30' : '42'}
            fontWeight="900"
            fontFamily="Inter, Roboto, Montserrat, system-ui, sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing="-0.02em"
          >
            {mainLetter}
          </text>

          {/* Elementos Gráficos Minimalistas Trazo 2px */}
          {targetClass === 'A' && (
            <g stroke={config.strokeHex} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Papelera / bote de basura en llamas */}
              <path d="M 38 72 L 41 87 C 41 88.5 42.5 90 44 90 L 56 90 C 57.5 90 59 88.5 59 87 L 62 72 Z" />
              <line x1="35" y1="72" x2="65" y2="72" />
              {/* Llama silueta */}
              <path d="M 50 56 C 45 62 46 66 50 70 C 54 66 55 62 50 56 Z" fill={config.strokeHex} fillOpacity="0.2" />
              <path d="M 50 61 C 48 64 48 67 50 69 C 52 67 52 64 50 61 Z" />
            </g>
          )}

          {targetClass === 'B' && (
            <g stroke={config.strokeHex} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Bidón / caneca de combustible inclinado en llamas */}
              <path d="M 38 76 L 46 66 L 56 74 L 48 84 Z" transform="rotate(-15 48 76)" />
              <path d="M 44 64 L 46 62 C 47 61 49 61 50 62 L 51 63" transform="rotate(-15 48 76)" />
              {/* Llama en el pico del bidón */}
              <path d="M 52 60 C 47 66 49 70 53 74 C 57 70 58 65 52 60 Z" fill={config.strokeHex} fillOpacity="0.2" />
              <path d="M 52 65 C 49 69 51 72 53 73 C 55 72 56 69 52 65 Z" />
            </g>
          )}

          {targetClass === 'C' && (
            <g stroke={config.strokeHex} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Rayo Eléctrico Horizontal Zigzag */}
              <path d="M 34 72 L 52 72 L 46 80 L 66 80 L 54 90 L 56 82 L 42 82 Z" fill={config.strokeHex} fillOpacity="0.2" />
            </g>
          )}

          {targetClass === 'D' && (
            <g stroke={config.strokeHex} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Engranaje de metal con llama */}
              <circle cx="50" cy="76" r="8" fill={config.strokeHex} fillOpacity="0.15" />
              <circle cx="50" cy="76" r="4" />
              <path d="M 50 64 L 50 66 M 50 86 L 50 88 M 38 76 L 40 76 M 60 76 L 62 76 M 41 67 L 43 69 M 57 83 L 59 85 M 41 85 L 43 83 M 57 69 L 59 67" />
              {/* Llama sobre engranaje */}
              <path d="M 50 56 C 45 62 47 66 50 70 C 53 66 55 62 50 56 Z" fill={config.strokeHex} fillOpacity="0.2" />
            </g>
          )}

          {targetClass === 'K' && (
            <g stroke={config.strokeHex} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Sartén / Freidora en llamas */}
              <path d="M 36 78 C 36 84 64 84 64 78 Z" fill={config.strokeHex} fillOpacity="0.2" />
              <line x1="64" y1="78" x2="78" y2="76" strokeWidth="3" />
              {/* Llama en la sartén */}
              <path d="M 50 60 C 44 67 46 72 50 76 C 54 72 56 67 50 60 Z" />
              <path d="M 50 66 C 47 70 48 73 50 75 C 52 73 53 70 50 66 Z" fill={config.strokeHex} />
            </g>
          )}
        </svg>
      </div>

      {showSubLabel && (
        <span className="mt-1 text-[10px] font-bold text-center text-stone-300 tracking-tight leading-tight">
          {config.title}
        </span>
      )}
    </div>
  );
}
