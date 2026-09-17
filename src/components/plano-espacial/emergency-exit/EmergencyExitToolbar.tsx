'use client';

import React from 'react';
import { useEmergencyStore } from '@/store/useEmergencyStore';
import {
  NOM026SignCategory,
  EmergencyExitType,
  ArrowDirection,
  SignMaterial,
  SignMountingType,
} from '@/types/emergencySignage';
import { calculateNOM026Dimensions } from '@/lib/emergencyNormativeValidator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DoorOpen,
  Footprints,
  Eye,
  EyeOff,
  Ruler,
  FileCheck,
  Compass,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface EmergencyExitToolbarProps {
  onOpenSummarySheet?: () => void;
}

export function EmergencyExitToolbar({ onOpenSummarySheet }: EmergencyExitToolbarProps) {
  const store = useEmergencyStore();

  const dims = calculateNOM026Dimensions(
    store.selectedViewingDistanceM,
    store.selectedCategory
  );

  const handleCategoryChange = (cat: NOM026SignCategory) => {
    store.setSelectedCategory(cat);
    if (cat === 'SALIDA_DE_EMERGENCIA') {
      store.setSelectedMountingType('SOBRE_PUERTA');
      store.setMountingHeightDefault(2.20);
    } else if (cat === 'RUTA_DE_EVACUACION') {
      store.setSelectedMountingType('ADHERIDO_PARED');
      store.setMountingHeightDefault(2.20);
    } else if (cat === 'ZONA_DE_SEGURIDAD') {
      store.setSelectedMountingType('TIPO_BANDERA');
      store.setMountingHeightDefault(2.50);
    }
    toast.info(`Categoría asignada: ${cat.replace(/_/g, ' ')}`);
  };

  return (
    <div className="bg-stone-900/95 backdrop-blur-md border border-emerald-900/60 text-stone-100 p-4 rounded-xl shadow-2xl space-y-4 select-none">
      {/* Header Capa EMERGENCY EXIT */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-950/90 border border-emerald-500/50 rounded-lg text-emerald-400">
            <DoorOpen className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                Capa Activa
              </span>
              <Badge
                variant="outline"
                className="border-emerald-500/50 bg-emerald-950/60 text-emerald-300 text-[10px] px-1.5 py-0 font-mono"
              >
                EMERGENCY EXIT (NOM-026-STPS-2008)
              </Badge>
            </div>
            <h4 className="text-sm font-bold text-white">
              Análisis de Rutas, Salidas de Emergencia y Señalización
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Cobertura de Visualización */}
          <Button
            variant="outline"
            size="sm"
            onClick={store.toggleShowCoverageDistances}
            className={`h-8 text-xs gap-1.5 font-semibold transition-all ${
              store.showCoverageDistances
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600 hover:bg-emerald-900'
                : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'
            }`}
            title="Mostrar u ocultar círculos de visualización normativos"
          >
            {store.showCoverageDistances ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" /> Radio Visual On
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Radio Oculto
              </>
            )}
          </Button>

          {/* Botón Resumen de Cuantificación */}
          {onOpenSummarySheet && (
            <Button
              variant="default"
              size="sm"
              onClick={onOpenSummarySheet}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 border border-emerald-400 shadow-sm"
            >
              <FileCheck className="w-3.5 h-3.5" /> Resumen NOM-026 & BOM
            </Button>
          )}
        </div>
      </div>

      {/* Controles de Selección de Parámetros Normativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* 1. Categoría NOM-026 */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
            <DoorOpen className="w-3.5 h-3.5 text-emerald-400" /> Categoría de Señal
          </Label>
          <Select
            value={store.selectedCategory}
            onValueChange={(val: NOM026SignCategory) => handleCategoryChange(val)}
          >
            <SelectTrigger className="h-8 bg-stone-800 border-stone-700 text-white text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-800 text-white text-xs">
              <SelectItem value="SALIDA_DE_EMERGENCIA">🚪 SALIDA DE EMERGENCIA</SelectItem>
              <SelectItem value="RUTA_DE_EVACUACION">➡️ RUTA DE EVACUACIÓN</SelectItem>
              <SelectItem value="ESCALERA_DE_EMERGENCIA">🪜 ESCALERA DE EMERGENCIA</SelectItem>
              <SelectItem value="ZONA_DE_SEGURIDAD">🟢 ZONA DE SEGURIDAD</SelectItem>
              <SelectItem value="PRIMEROS_AUXILIOS">➕ PRIMEROS AUXILIOS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 2. Distancia de Visualización L */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5 text-emerald-400" /> Distancia Obs. L (m)
          </Label>
          <Select
            value={String(store.selectedViewingDistanceM)}
            onValueChange={(val) => store.setSelectedViewingDistanceM(parseInt(val, 10))}
          >
            <SelectTrigger className="h-8 bg-stone-800 border-stone-700 text-white text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-800 text-white text-xs">
              <SelectItem value="5">5 m (125 cm² - 15.8 x 7.9 cm)</SelectItem>
              <SelectItem value="10">10 m (500 cm² - 31.6 x 15.8 cm)</SelectItem>
              <SelectItem value="15">15 m (1,125 cm² - 47.4 x 23.7 cm)</SelectItem>
              <SelectItem value="20">20 m (2,000 cm² - 63.2 x 31.6 cm)</SelectItem>
              <SelectItem value="30">30 m (4,500 cm² - 94.9 x 47.4 cm)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 3. Dirección de Flecha */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-emerald-400" /> Dirección Flecha
          </Label>
          <Select
            value={store.selectedArrowDirection}
            onValueChange={(val: ArrowDirection) => store.setSelectedArrowDirection(val)}
          >
            <SelectTrigger className="h-8 bg-stone-800 border-stone-700 text-white text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-800 text-white text-xs">
              <SelectItem value="RIGHT">➡️ Derecha (→)</SelectItem>
              <SelectItem value="LEFT">⬅️ Izquierda (←)</SelectItem>
              <SelectItem value="UP">⬆️ Arriba (↑)</SelectItem>
              <SelectItem value="DOWN">⬇️ Abajo (↓)</SelectItem>
              <SelectItem value="UP_RIGHT">↗️ Diagonal Arriba-Der (↗)</SelectItem>
              <SelectItem value="UP_LEFT">↖️ Diagonal Arriba-Izq (↖)</SelectItem>
              <SelectItem value="DOWN_RIGHT">↘️ Diagonal Abajo-Der (↘)</SelectItem>
              <SelectItem value="DOWN_LEFT">↙️ Diagonal Abajo-Izq (↙)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 4. Soporte y Montaje */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Tipo de Soporte
          </Label>
          <Select
            value={store.selectedMountingType}
            onValueChange={(val: SignMountingType) => store.setSelectedMountingType(val)}
          >
            <SelectTrigger className="h-8 bg-stone-800 border-stone-700 text-white text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-800 text-white text-xs">
              <SelectItem value="SOBRE_PUERTA">Sobre Puerta (1.60m-2.20m)</SelectItem>
              <SelectItem value="ADHERIDO_PARED">Adherido a Pared (2.20m)</SelectItem>
              <SelectItem value="TIPO_BANDERA">Tipo Bandera (2.50m)</SelectItem>
              <SelectItem value="COLGANTE_TECHO">Colgante de Techo (2.50m)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 5. Material */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Material
          </Label>
          <Select
            value={store.selectedMaterial}
            onValueChange={(val: SignMaterial) => store.setSelectedMaterial(val)}
          >
            <SelectTrigger className="h-8 bg-stone-800 border-stone-700 text-white text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-800 text-white text-xs">
              <SelectItem value="ACRILICO_FOTOLUMINISCENTE">Acrílico Fotoluminiscente</SelectItem>
              <SelectItem value="VINILO_ADHERIBLE">Vinilo Adherible</SelectItem>
              <SelectItem value="ALUMINIO_FOTOLUMINISCENTE">Aluminio Fotoluminiscente</SelectItem>
              <SelectItem value="ESTRUCTURA_BANDERA">Estructura Doble Vista</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fila de Especificación Dimensional NOM-026 en Tiempo Real */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-emerald-900/40 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-[11px] text-stone-400">Altura Montaje:</Label>
            <Input
              type="number"
              step="0.05"
              min="1.50"
              max="2.80"
              value={store.mountingHeightDefault}
              onChange={(e) => store.setMountingHeightDefault(parseFloat(e.target.value) || 2.20)}
              className="w-20 h-7 bg-stone-800 border-stone-700 text-white text-xs font-mono text-center"
            />
            <span className="text-[11px] text-stone-400">m del piso</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-emerald-500/60 bg-emerald-950 text-emerald-200 text-[11px] px-2.5 py-0.5 font-mono"
            >
              Dimensión Mínima NOM-026: {dims.widthCm} x {dims.heightCm} cm ({dims.surfaceCm2} cm²)
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-950/80 px-3 py-1.5 rounded-lg border border-emerald-600/50 text-[11px]">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-stone-300">
            Fórmula: <strong className="text-emerald-300">S ≥ L²/2000</strong> (Fondo Verde #00A651 ≥50%, Símbolo Blanco #FFFFFF).
          </span>
        </div>
      </div>
    </div>
  );
}
