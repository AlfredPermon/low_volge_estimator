'use client';

import React from 'react';
import { useEmergencyStore, EmergencyToolMode } from '@/store/useEmergencyStore';
import { NOM026SignCategory, ArrowDirection } from '@/types/emergencySignage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MousePointer,
  DoorOpen,
  Footprints,
  FileCheck,
  Compass,
  PlusCircle,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface EmergencyExitFloatingToolbarProps {
  onOpenSummarySheet?: () => void;
}

export function EmergencyExitFloatingToolbar({
  onOpenSummarySheet,
}: EmergencyExitFloatingToolbarProps) {
  const store = useEmergencyStore();

  const handleToolSelect = (
    tool: EmergencyToolMode,
    category?: NOM026SignCategory,
    arrowDir?: ArrowDirection
  ) => {
    store.setActiveTool(tool);
    if (category) store.setSelectedCategory(category);
    if (arrowDir) store.setSelectedArrowDirection(arrowDir);

    const names: Record<EmergencyToolMode, string> = {
      SELECT: 'Modo Selección',
      SEED_EXIT: 'Sembrado: Salida de Emergencia 🚪',
      SEED_STAIR: 'Sembrado: Escalera de Emergencia 🪜',
      SEED_ARROW: 'Sembrado: Ruta de Evacuación / Flecha ➡️',
      SEED_SAFE_ZONE: 'Sembrado: Zona de Seguridad 🟢',
      SEED_FIRST_AID: 'Sembrado: Botiquín / Primeros Auxilios ➕',
    };

    toast.info(names[tool], { icon: '🚨' });
  };

  return (
    <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1.5 bg-stone-900/90 backdrop-blur-md p-1.5 rounded-xl border border-emerald-500/40 shadow-2xl select-none">
      {/* Badge Capa Activa */}
      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-950/90 rounded-lg border border-emerald-600/50 mr-1">
        <DoorOpen className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wide">
          NOM-026 EXIT
        </span>
      </div>

      {/* Botón Puntero Selección */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleToolSelect('SELECT')}
        className={`h-7 px-2 text-[11px] font-bold gap-1 transition-all ${
          store.activeTool === 'SELECT'
            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
            : 'text-stone-300 hover:bg-stone-800'
        }`}
        title="Modo Selección / Mover Dispositivos"
      >
        <MousePointer className="w-3 h-3" /> Selección
      </Button>

      {/* Botón Salida de Emergencia (Puerta) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleToolSelect('SEED_EXIT', 'SALIDA_DE_EMERGENCIA')}
        className={`h-7 px-2 text-[11px] font-bold gap-1 transition-all ${
          store.activeTool === 'SEED_EXIT'
            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
            : 'text-stone-300 hover:bg-stone-800'
        }`}
        title="Sembrar Puerta / Salida de Emergencia Directa"
      >
        🚪 Salida
      </Button>

      {/* Botón Escalera de Emergencia */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleToolSelect('SEED_STAIR', 'ESCALERA_DE_EMERGENCIA')}
        className={`h-7 px-2 text-[11px] font-bold gap-1 transition-all ${
          store.activeTool === 'SEED_STAIR'
            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
            : 'text-stone-300 hover:bg-stone-800'
        }`}
        title="Sembrar Acceso a Escalera de Emergencia"
      >
        🪜 Escalera
      </Button>

      {/* Botón Ruta de Evacuación (Flecha Derecha →) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleToolSelect('SEED_ARROW', 'RUTA_DE_EVACUACION', 'RIGHT')}
        className={`h-7 px-2 text-[11px] font-bold gap-1 transition-all ${
          store.activeTool === 'SEED_ARROW' && store.selectedArrowDirection === 'RIGHT'
            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
            : 'text-stone-300 hover:bg-stone-800'
        }`}
        title="Sembrar Señal de Ruta de Evacuación (Flecha Derecha →)"
      >
        ➡️ Flecha (→)
      </Button>

      {/* Botón Flecha Izquierda ← */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleToolSelect('SEED_ARROW', 'RUTA_DE_EVACUACION', 'LEFT')}
        className={`h-7 px-1.5 text-[11px] font-bold gap-1 transition-all ${
          store.activeTool === 'SEED_ARROW' && store.selectedArrowDirection === 'LEFT'
            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
            : 'text-stone-300 hover:bg-stone-800'
        }`}
        title="Flecha Izquierda (←)"
      >
        ⬅️ (←)
      </Button>

      {/* Botón Flecha Arriba ↑ */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleToolSelect('SEED_ARROW', 'RUTA_DE_EVACUACION', 'UP')}
        className={`h-7 px-1.5 text-[11px] font-bold gap-1 transition-all ${
          store.activeTool === 'SEED_ARROW' && store.selectedArrowDirection === 'UP'
            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
            : 'text-stone-300 hover:bg-stone-800'
        }`}
        title="Flecha Arriba (↑)"
      >
        ⬆️ (↑)
      </Button>

      {/* Botón Zona de Seguridad */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleToolSelect('SEED_SAFE_ZONE', 'ZONA_DE_SEGURIDAD')}
        className={`h-7 px-2 text-[11px] font-bold gap-1 transition-all ${
          store.activeTool === 'SEED_SAFE_ZONE'
            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
            : 'text-stone-300 hover:bg-stone-800'
        }`}
        title="Sembrar Punto de Reunión / Zona de Seguridad Exterior"
      >
        🟢 Punto Reunión
      </Button>

      {/* Trigger de Resumen */}
      {onOpenSummarySheet && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSummarySheet}
          className="h-7 px-2 text-[10px] bg-emerald-950 text-emerald-300 border-emerald-600/70 hover:bg-emerald-900 font-bold gap-1 ml-1"
          title="Ver reporte BOM y dictamen de cumplimiento NOM-026"
        >
          <FileCheck className="w-3 h-3 text-emerald-400" /> Resumen BOM
        </Button>
      )}
    </div>
  );
}
