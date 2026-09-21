'use client';

import React, { useState } from 'react';
import { ExtinguisherDevice, ExtinguisherType } from '@/types/fireProtection';
import { useFireStore } from '@/store/useFireStore';
import { Flame, ShieldAlert, ShieldCheck, Trash2, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExtinguisherClassIcon } from './ExtinguisherClassIcon';

interface ExtinguisherCanvasLayerProps {
  extinguishers: ExtinguisherDevice[];
  scaleMetersPerPx: number; // scale in m/px (e.g. 0.05)
  showCoverageRadii?: boolean;
  currentFloorplanId?: string;
  selectedId?: string | null;
  onSelectExtinguisher?: (device: ExtinguisherDevice) => void;
  onRemoveExtinguisher?: (id: string) => void;
  onMouseDownMarker?: (device: ExtinguisherDevice, e: React.MouseEvent) => void;
}

const AGENT_STYLE: Record<ExtinguisherType, { bg: string; border: string; text: string; fill: string }> = {
  PQS_ABC: { bg: 'bg-red-600', border: 'border-red-400', text: 'text-red-200', fill: '#dc2626' },
  CO2: { bg: 'bg-blue-600', border: 'border-blue-400', text: 'text-blue-200', fill: '#2563eb' },
  CLEAN_AGENT: { bg: 'bg-purple-600', border: 'border-purple-400', text: 'text-purple-200', fill: '#9333ea' },
  WATER_PRESSURIZED: { bg: 'bg-cyan-600', border: 'border-cyan-400', text: 'text-cyan-200', fill: '#0891b2' },
  AFFF: { bg: 'bg-teal-600', border: 'border-teal-400', text: 'text-teal-200', fill: '#0d9488' },
  CLASS_K: { bg: 'bg-amber-600', border: 'border-amber-400', text: 'text-amber-200', fill: '#d97706' },
};

export function ExtinguisherCanvasLayer({
  extinguishers,
  scaleMetersPerPx = 0.05,
  showCoverageRadii = true,
  currentFloorplanId,
  selectedId,
  onSelectExtinguisher,
  onRemoveExtinguisher,
  onMouseDownMarker,
}: ExtinguisherCanvasLayerProps) {
  const store = useFireStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const displayRadii = showCoverageRadii ?? store.showCoverageRadii;
  const activeExtinguishers = extinguishers.filter(
    (dev) => !dev.planoId || !currentFloorplanId || dev.planoId === currentFloorplanId
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* ─── SVG Layer para los Radios de Cobertura Translúcidos (15m / 30m) ─── */}
      <svg className="w-full h-full absolute inset-0 pointer-events-none">
        {displayRadii &&
          activeExtinguishers.map((dev) => {
            const isEffectiveMode = store.radiusDisplayMode === 'EFFECTIVE_2D';
            const nominalRadiusM = dev.coverageRadiusMeters || (dev.riskZone === 'HIGH_RISK' ? 15.0 : 30.0);
            const displayRadiusM = isEffectiveMode ? nominalRadiusM / 2 : nominalRadiusM;
            const radiusPx = scaleMetersPerPx > 0 ? displayRadiusM / scaleMetersPerPx : displayRadiusM * 20;
            const isValid = dev.isValidLocation;

            return (
              <g key={`radius_${dev.id}`}>
                {/* Circulo de cobertura translúcido */}
                <circle
                  cx={dev.x}
                  cy={dev.y}
                  r={radiusPx}
                  fill={isValid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.22)'}
                  stroke={isValid ? '#10b981' : '#ef4444'}
                  strokeWidth="1.5"
                  strokeDasharray={isValid ? '6 4' : '4 3'}
                  className="transition-all duration-300"
                />
                {/* Radio Etiqueta con Escala Nítida */}
                <text
                  x={dev.x}
                  y={dev.y - radiusPx + 14}
                  textAnchor="middle"
                  fill={isValid ? '#10b981' : '#ef4444'}
                  fontSize="10"
                  fontWeight="bold"
                  className="select-none font-mono drop-shadow-sm"
                >
                  {isEffectiveMode
                    ? `Radio Efectivo 2D: ${displayRadiusM.toFixed(1)}m (${Math.round(radiusPx)}px)`
                    : `Recorrido NOM: ${displayRadiusM.toFixed(1)}m (${Math.round(radiusPx)}px)`}
                </text>
              </g>
            );
          })}
      </svg>

      {/* ─── Marcadores Vectoriales de Extintor sobre el Canvas ─── */}
      {activeExtinguishers.map((dev) => {
        const isHovered = hoveredId === dev.id;
        const isSelected = selectedId === dev.id;
        const showPopover = isHovered || isSelected;
        const isValid = dev.isValidLocation;

        return (
          <div
            key={`marker_${dev.id}`}
            style={{
              position: 'absolute',
              left: `${dev.x}px`,
              top: `${dev.y}px`,
              zIndex: showPopover ? 100 : 20,
            }}
            className="pointer-events-auto group cursor-move select-none"
            onMouseEnter={() => setHoveredId(dev.id)}
            onMouseLeave={() => setHoveredId(null)}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (onMouseDownMarker) onMouseDownMarker(dev, e);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectExtinguisher) onSelectExtinguisher(dev);
            }}
          >
            {/* Pulsado de alerta en rojo si no cumple la norma */}
            {!isValid && (
              <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-red-500/40 animate-ping pointer-events-none" />
            )}

            {/* Círculo Base del Ícono (Estático, centrado exactamente en dev.x, dev.y) */}
            <div
              className={`absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center p-1 rounded-full shadow-md border transition-colors duration-200 bg-white/85 hover:bg-white/95 border-stone-300/90 backdrop-blur-md ${
                showPopover ? 'ring-2 ring-orange-500 shadow-xl border-orange-500' : ''
              }`}
              style={{ width: '36px', height: '36px' }}
            >
              <ExtinguisherClassIcon agentType={dev.type} size={26} />
              {/* Indicador de Estado Normativo */}
              <span className="absolute -bottom-0.5 -right-0.5 bg-white/95 rounded-full p-0.5 shadow-sm border border-stone-200">
                {isValid ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-red-600 animate-bounce shrink-0" />
                )}
              </span>
            </div>

            {/* Píldora de Texto Desplegable hacia la Derecha (Inicia en la orilla del círculo y despliega a la derecha) */}
            <div
              className={`absolute left-[18px] top-0 -translate-y-1/2 overflow-hidden transition-all duration-300 ease-out flex items-center ${
                showPopover
                  ? 'max-w-[160px] opacity-100 translate-x-1.5'
                  : 'max-w-0 opacity-0 translate-x-0 pointer-events-none'
              }`}
            >
              <div className="px-2.5 py-1 rounded-xl shadow-md border border-stone-300/90 bg-white/80 hover:bg-white/95 backdrop-blur-md whitespace-nowrap flex flex-col text-left">
                <span className="text-[10px] font-mono tracking-tight font-black text-stone-950 leading-none">
                  {dev.type}
                </span>
                <span className="text-[9px] text-stone-800 font-mono font-bold leading-none mt-0.5">
                  {dev.capacity}
                </span>
              </div>
            </div>

            {/* ─── Tooltip Informativo Flotante Equilibrio Cristalino Glassmorphism (Alta Legibilidad) ─── */}
            {showPopover && (
              <div
                className="absolute left-0 bottom-[22px] -translate-x-1/2 w-64 bg-stone-900/65 backdrop-blur-md text-stone-100 p-3 rounded-xl shadow-2xl border border-white/20 text-xs z-50 pointer-events-auto space-y-2"
                onMouseEnter={() => setHoveredId(dev.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Puente transparente invisible para evitar pérdida de foco al mover cursor */}
                <div className="absolute -bottom-3 left-0 right-0 h-4 pointer-events-auto bg-transparent" />

                {/* Header Tooltip */}
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-orange-400 drop-shadow-sm">
                    <Flame className="w-4 h-4" />
                    <span>{dev.type} {dev.capacity}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 shadow-sm ${
                      isValid ? 'border-emerald-400/60 bg-emerald-950/80 text-emerald-300 font-bold' : 'border-red-400/60 bg-red-950/80 text-red-300 font-bold'
                    }`}
                  >
                    {isValid ? 'CUMPLE NOMs' : 'ALERTA NORMATIVA'}
                  </Badge>
                </div>

                {/* Detalles de Área y Montaje */}
                <div className="space-y-1 text-[11px] text-stone-200">
                  <div className="flex justify-between">
                    <span className="text-stone-300/90 font-medium drop-shadow-xs">Área Médica:</span>
                    <span className="font-bold text-white drop-shadow-sm">{dev.medicalArea || 'Pasillo/General'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-300/90 font-medium drop-shadow-xs">Zona de Riesgo:</span>
                    <span className="font-bold text-stone-100 drop-shadow-sm">{dev.riskZone === 'HIGH_RISK' ? 'Alto Riesgo (15m)' : 'Ordinario (30m)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-300/90 font-medium drop-shadow-xs">Altura Montaje (NOM-002):</span>
                    <span className={`font-mono ${dev.mountingHeight > 1.50 ? 'text-red-300 font-bold drop-shadow-sm' : 'text-emerald-300 font-bold drop-shadow-sm'}`}>
                      {dev.mountingHeight.toFixed(2)}m (máx 1.50m)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-300/90 font-medium drop-shadow-xs">Señalización (NOM-026):</span>
                    <span className="font-mono text-stone-100 font-bold drop-shadow-sm">
                      {dev.hasSignaling ? `Sí (${dev.signalingHeight.toFixed(2)}m)` : 'Faltante'}
                    </span>
                  </div>
                </div>

                {/* Lista de Alertas Normativas */}
                {dev.validationAlerts && dev.validationAlerts.length > 0 && (
                  <div className="pt-1.5 border-t border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 drop-shadow-sm">
                      <ShieldAlert className="w-3 h-3" /> Advertencias Normativas:
                    </span>
                    <ul className="space-y-0.5 text-[10px] text-stone-200 list-disc pl-3">
                      {dev.validationAlerts.map((alert, idx) => (
                        <li key={idx} className="leading-tight text-red-300 font-medium drop-shadow-xs">
                          {alert}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Acciones del Extintor */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setHoveredId(null);
                      if (onRemoveExtinguisher) {
                        onRemoveExtinguisher(dev.id);
                      } else {
                        store.removeExtinguisher(dev.id);
                      }
                    }}
                    className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/60 font-bold gap-1 px-2 drop-shadow-xs"
                  >
                    <Trash2 className="w-3 h-3" /> Eliminar Extintor
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
