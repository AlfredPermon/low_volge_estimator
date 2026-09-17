'use client';

import React, { useState } from 'react';
import {
  EmergencySignDevice,
  NOM026SignCategory,
  ArrowDirection,
} from '@/types/emergencySignage';
import { useEmergencyStore } from '@/store/useEmergencyStore';
import {
  DoorOpen,
  Footprints,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface EmergencyExitCanvasLayerProps {
  devices: EmergencySignDevice[];
  scaleMetersPerPx: number; // scale in m/px (e.g. 0.05)
  showCoverageDistances?: boolean;
  currentFloorplanId?: string;
  selectedId?: string | null;
  onSelectDevice?: (device: EmergencySignDevice) => void;
  onRemoveDevice?: (id: string) => void;
  onMouseDownMarker?: (device: EmergencySignDevice, e: React.MouseEvent) => void;
}

const CATEGORY_SYMBOLS: Record<NOM026SignCategory, string> = {
  SALIDA_DE_EMERGENCIA: '🚪',
  RUTA_DE_EVACUACION: '➡️',
  ESCALERA_DE_EMERGENCIA: '🪜',
  ZONA_DE_SEGURIDAD: '🟢',
  PRIMEROS_AUXILIOS: '➕',
};

const ARROW_SYMBOLS: Record<ArrowDirection, string> = {
  RIGHT: '→',
  LEFT: '←',
  UP: '↑',
  DOWN: '↓',
  UP_RIGHT: '↗',
  UP_LEFT: '↖',
  DOWN_RIGHT: '↘',
  DOWN_LEFT: '↙',
};

export function EmergencyExitCanvasLayer({
  devices,
  scaleMetersPerPx = 0.05,
  showCoverageDistances = true,
  currentFloorplanId,
  selectedId,
  onSelectDevice,
  onRemoveDevice,
  onMouseDownMarker,
}: EmergencyExitCanvasLayerProps) {
  const store = useEmergencyStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const displayRadii = showCoverageDistances ?? store.showCoverageDistances;
  const activeDevices = devices.filter(
    (dev) => !dev.planoId || !currentFloorplanId || dev.planoId === currentFloorplanId
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* ─── SVG Layer para Radios de Visualización Normativos (S >= L^2 / 2000) ─── */}
      <svg className="w-full h-full absolute inset-0 pointer-events-none">
        {displayRadii &&
          activeDevices.map((dev) => {
            const displayRadiusM = dev.viewingDistanceM || 15.0;
            const radiusPx = scaleMetersPerPx > 0 ? displayRadiusM / scaleMetersPerPx : displayRadiusM * 20;
            const isValid = dev.isValidLocation;

            return (
              <g key={`emg_radius_${dev.id}`}>
                {/* Círculo de cobertura translúcido verde de seguridad */}
                <circle
                  cx={dev.x}
                  cy={dev.y}
                  r={radiusPx}
                  fill={isValid ? 'rgba(0, 166, 81, 0.12)' : 'rgba(239, 68, 68, 0.22)'}
                  stroke={isValid ? '#00A651' : '#ef4444'}
                  strokeWidth="1.5"
                  strokeDasharray={isValid ? '6 4' : '4 3'}
                  className="transition-all duration-300"
                />
                {/* Etiqueta de Distancia de Visualización L */}
                <text
                  x={dev.x}
                  y={dev.y - radiusPx + 14}
                  textAnchor="middle"
                  fill={isValid ? '#00A651' : '#ef4444'}
                  fontSize="10"
                  fontWeight="bold"
                  className="select-none font-mono drop-shadow-sm"
                >
                  Visualización NOM-026: {displayRadiusM}m ({Math.round(radiusPx)}px)
                </text>
              </g>
            );
          })}
      </svg>

      {/* ─── Marcadores Vectoriales de Señalización NOM-026 sobre Canvas ─── */}
      {activeDevices.map((dev) => {
        const isHovered = hoveredId === dev.id;
        const isSelected = selectedId === dev.id;
        const showPopover = isHovered || isSelected;
        const isValid = dev.isValidLocation;
        const arrowSymbol = dev.arrowDirection ? ARROW_SYMBOLS[dev.arrowDirection] : '→';
        const categorySymbol = CATEGORY_SYMBOLS[dev.category] || '🚪';

        return (
          <div
            key={`emg_marker_${dev.id}`}
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
              if (onSelectDevice) onSelectDevice(dev);
            }}
          >
            {/* Alerta parpadeante roja si no cumple la norma */}
            {!isValid && (
              <span className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-red-500/40 animate-ping pointer-events-none" />
            )}

            {/* Placa Rectangular de la Señal NOM-026 (Verde Seguridad #00A651 + Blanco #FFFFFF) */}
            <div
              className={`absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1.5 px-2 py-1 rounded-md shadow-lg border transition-all duration-200 bg-[#00A651] text-white border-white/90 ${
                showPopover ? 'ring-2 ring-emerald-400 shadow-2xl scale-110' : ''
              }`}
              style={{ minWidth: '44px', minHeight: '28px' }}
            >
              <span className="text-sm font-black leading-none">{categorySymbol}</span>
              {dev.category === 'RUTA_DE_EVACUACION' && (
                <span className="text-base font-extrabold leading-none text-white font-mono">
                  {arrowSymbol}
                </span>
              )}

              {/* Indicador de Estado Normativo */}
              <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-stone-300">
                {isValid ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-red-600 animate-bounce shrink-0" />
                )}
              </span>
            </div>

            {/* Tooltip Popover Glassmorphism Alta Legibilidad */}
            {showPopover && (
              <div
                className="absolute left-0 bottom-[24px] -translate-x-1/2 w-72 bg-stone-900/90 backdrop-blur-md text-stone-100 p-3 rounded-xl shadow-2xl border border-emerald-500/40 text-xs z-50 pointer-events-auto space-y-2"
                onMouseEnter={() => setHoveredId(dev.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Tooltip */}
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400 drop-shadow-sm">
                    <DoorOpen className="w-4 h-4" />
                    <span>{dev.category.replace(/_/g, ' ')}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${
                      isValid
                        ? 'border-emerald-400/60 bg-emerald-950/90 text-emerald-300 font-bold'
                        : 'border-red-400/60 bg-red-950/90 text-red-300 font-bold'
                    }`}
                  >
                    {isValid ? 'CUMPLE NOM-026' : 'ALERTA NORMATIVA'}
                  </Badge>
                </div>

                {/* Especificaciones Dimensionales y Montaje */}
                <div className="space-y-1 text-[11px] text-stone-200">
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">Distancia Obs. (L):</span>
                    <span className="font-bold text-white font-mono">{dev.viewingDistanceM} metros</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">Dimensiones (W x H):</span>
                    <span className="font-bold text-emerald-300 font-mono">
                      {(dev.widthM * 100).toFixed(1)} x {(dev.heightM * 100).toFixed(1)} cm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">Superficie (S):</span>
                    <span className="font-bold text-emerald-300 font-mono">
                      {(dev.surfaceAreaM2 * 10000).toFixed(0)} cm² (S ≥ L²/2000)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">Altura Montaje:</span>
                    <span className="font-bold text-white font-mono">{dev.mountingHeightM.toFixed(2)} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-300 font-medium">Soporte / Material:</span>
                    <span className="font-bold text-stone-200 truncate max-w-[140px]" title={dev.material}>
                      {dev.material.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Alertas Normativas */}
                {dev.validationAlerts && dev.validationAlerts.length > 0 && (
                  <div className="pt-1.5 border-t border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Advertencias Normativas:
                    </span>
                    <ul className="space-y-0.5 text-[10px] text-red-300 list-disc pl-3">
                      {dev.validationAlerts.map((alert, idx) => (
                        <li key={idx} className="leading-tight font-medium">
                          {alert}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Acciones */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setHoveredId(null);
                      if (onRemoveDevice) {
                        onRemoveDevice(dev.id);
                      } else {
                        store.removeEmergencyDevice(dev.id);
                      }
                    }}
                    className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/60 font-bold gap-1 px-2"
                  >
                    <Trash2 className="w-3 h-3" /> Eliminar Señal
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
