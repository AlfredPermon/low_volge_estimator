'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEmergencyStore, EmergencyToolMode } from '@/store/useEmergencyStore';
import {
  NOM026SignCategory,
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
  MousePointer,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Layers,
  Ruler,
  FileCheck,
  Compass,
  ChevronDown,
  X,
  SlidersHorizontal,
  ShieldCheck,
  Footprints,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

interface EmergencyExitFloatingToolbarProps {
  onOpenSummarySheet?: () => void;
  onSelectTool?: (tool: string) => void;
}

export function EmergencyExitFloatingToolbar({
  onOpenSummarySheet,
  onSelectTool,
}: EmergencyExitFloatingToolbarProps) {
  const store = useEmergencyStore();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Ocultar panel automáticamente al hacer clic fuera de la barra flotante (ej. en el canvas)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const isInsideToolbar = toolbarRef.current?.contains(target);
      const isInsidePortal = target.closest(
        '[role="listbox"], [role="option"], [data-radix-popper-content-wrapper], [data-radix-select-content], [data-slot="select-item"], [data-slot="select-trigger"], [data-slot="select-value"]'
      );

      if (!isInsideToolbar && !isInsidePortal) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToolSelect = (
    tool: EmergencyToolMode,
    category?: NOM026SignCategory,
    arrowDir?: ArrowDirection
  ) => {
    store.setActiveTool(tool);
    if (category) store.setSelectedCategory(category);
    if (arrowDir) store.setSelectedArrowDirection(arrowDir);

    if (tool === 'SELECT') {
      if (onSelectTool) onSelectTool('select');
    } else {
      if (onSelectTool) onSelectTool('add_device');
    }

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

  const dims = calculateNOM026Dimensions(
    store.selectedViewingDistanceM,
    store.selectedCategory
  );

  return (
    <div ref={toolbarRef} className="absolute top-4 left-4 z-40 pointer-events-auto select-none font-sans">
      {/* ─── Botón Flotante Activador Esquina Superior Izquierda (Vidrio Translúcido Liquid Glass Verde Emerald) ─── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-2xl shadow-2xl border transition-all duration-300 backdrop-blur-md ${
          isOpen
            ? 'bg-stone-950/65 text-white border-emerald-400/90 ring-2 ring-emerald-500/50'
            : 'bg-stone-950/45 hover:bg-stone-950/65 text-stone-100 border-white/30 hover:border-emerald-400/60 shadow-black/40'
        }`}
        title="Desplegar Herramientas de Capa Activa EMERGENCY EXIT (NOM-026-STPS-2008)"
      >
        <div className="p-1 bg-emerald-950/90 border border-emerald-500/80 rounded-lg text-emerald-400 shrink-0 shadow-md">
          <DoorOpen className="w-4 h-4 animate-pulse" />
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              Capa Activa
            </span>
            <Badge variant="outline" className="border-emerald-400/60 bg-emerald-950/80 text-emerald-200 text-[9px] px-1 py-0 font-mono font-bold shadow-sm">
              NOM-026
            </Badge>
          </div>
          <span className="text-xs font-black text-white tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            EMERGENCY EXIT SEED
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-stone-200 transition-transform duration-300 ml-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
            isOpen ? 'rotate-180 text-emerald-400' : 'group-hover:text-white'
          }`}
        />
      </button>

      {/* ─── Panel Flotante Desplegable Vertical Ampliado (Vidrio Translúcido Liquid Glass con Paleta Emerald) ─── */}
      <div
        className={`absolute top-13 left-0 w-[860px] max-w-[calc(100vw-2rem)] transition-all duration-300 ease-out origin-top-left ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-3 pointer-events-none'
        }`}
      >
        <div className="bg-stone-950/75 backdrop-blur-xl border border-white/25 text-stone-100 p-4 rounded-2xl shadow-2xl space-y-3 backdrop-saturate-150">
          
          {/* Header del Panel Flotante */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/15">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-stone-950/80 border border-emerald-500/70 rounded-xl text-emerald-400 shadow-md">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white flex items-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                  <span>Análisis de Rutas, Salidas y Señalización (NOM-026-STPS-2008)</span>
                  <Badge variant="outline" className="border-emerald-400/70 bg-emerald-950/80 text-emerald-200 text-[9px] font-bold">
                    FLOTANTE
                  </Badge>
                </h4>
                <p className="text-[10px] font-semibold text-stone-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Configuración rápida de parámetros normativos y sembrado sobre el canvas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Radios / Círculos de Cobertura */}
              <Button
                variant="outline"
                size="sm"
                onClick={store.toggleShowCoverageDistances}
                className={`h-7 text-[10px] gap-1.5 font-extrabold transition-all border shadow-md ${
                  store.showCoverageDistances
                    ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/90 hover:bg-emerald-900/90'
                    : 'bg-stone-950/70 text-stone-300 border-white/20 hover:bg-stone-900/80'
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
                  onClick={() => {
                    onOpenSummarySheet();
                    setIsOpen(false);
                  }}
                  className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-black gap-1.5 border border-emerald-400 shadow-md drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                >
                  <FileCheck className="w-3.5 h-3.5" /> Resumen NOM-026 & BOM
                </Button>
              )}

              {/* Cerrar Panel */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-stone-300 hover:text-white hover:bg-white/20 rounded-lg"
                title="Cerrar panel flotante"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Sección 1: Selector de Modo / Herramienta Activa de Sembrado en Canvas */}
          <div className="space-y-1 bg-stone-950/50 p-2 rounded-xl border border-white/10">
            <Label className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              <MousePointer className="w-3 h-3 text-emerald-400" /> Herramienta de Sembrado en Canvas
            </Label>

            <div className="flex flex-wrap items-center gap-1">
              {/* Botón Selección */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolSelect('SELECT')}
                className={`h-6.5 px-2 text-[10px] font-extrabold gap-1 transition-all border shadow-sm ${
                  store.activeTool === 'SELECT'
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-1 ring-emerald-300'
                    : 'bg-stone-900/80 text-stone-200 border-white/15 hover:bg-stone-800'
                }`}
                title="Modo Selección / Mover Dispositivos"
              >
                <MousePointer className="w-3 h-3" /> Selección
              </Button>

              {/* Botón Salida */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolSelect('SEED_EXIT', 'SALIDA_DE_EMERGENCIA')}
                className={`h-6.5 px-2 text-[10px] font-extrabold gap-1 transition-all border shadow-sm ${
                  store.activeTool === 'SEED_EXIT'
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-1 ring-emerald-300'
                    : 'bg-stone-900/80 text-stone-200 border-white/15 hover:bg-stone-800'
                }`}
                title="Sembrar Puerta / Salida de Emergencia Directa"
              >
                🚪 Salida
              </Button>

              {/* Botón Escalera */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolSelect('SEED_STAIR', 'ESCALERA_DE_EMERGENCIA')}
                className={`h-6.5 px-2 text-[10px] font-extrabold gap-1 transition-all border shadow-sm ${
                  store.activeTool === 'SEED_STAIR'
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-1 ring-emerald-300'
                    : 'bg-stone-900/80 text-stone-200 border-white/15 hover:bg-stone-800'
                }`}
                title="Sembrar Acceso a Escalera de Emergencia"
              >
                <Footprints className="w-3 h-3" /> Escalera
              </Button>

              {/* Flecha Derecha */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolSelect('SEED_ARROW', 'RUTA_DE_EVACUACION', 'RIGHT')}
                className={`h-6.5 px-2 text-[10px] font-extrabold gap-1 transition-all border shadow-sm ${
                  store.activeTool === 'SEED_ARROW' && store.selectedArrowDirection === 'RIGHT'
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-1 ring-emerald-300'
                    : 'bg-stone-900/80 text-stone-200 border-white/15 hover:bg-stone-800'
                }`}
                title="Flecha Derecha (→)"
              >
                ➡️ (→)
              </Button>

              {/* Flecha Izquierda */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolSelect('SEED_ARROW', 'RUTA_DE_EVACUACION', 'LEFT')}
                className={`h-6.5 px-2 text-[10px] font-extrabold gap-1 transition-all border shadow-sm ${
                  store.activeTool === 'SEED_ARROW' && store.selectedArrowDirection === 'LEFT'
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-1 ring-emerald-300'
                    : 'bg-stone-900/80 text-stone-200 border-white/15 hover:bg-stone-800'
                }`}
                title="Flecha Izquierda (←)"
              >
                ⬅️ (←)
              </Button>

              {/* Flecha Arriba */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolSelect('SEED_ARROW', 'RUTA_DE_EVACUACION', 'UP')}
                className={`h-6.5 px-2 text-[10px] font-extrabold gap-1 transition-all border shadow-sm ${
                  store.activeTool === 'SEED_ARROW' && store.selectedArrowDirection === 'UP'
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-1 ring-emerald-300'
                    : 'bg-stone-900/80 text-stone-200 border-white/15 hover:bg-stone-800'
                }`}
                title="Flecha Arriba (↑)"
              >
                ⬆️ (↑)
              </Button>

              {/* Flecha Abajo */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolSelect('SEED_ARROW', 'RUTA_DE_EVACUACION', 'DOWN')}
                className={`h-6.5 px-2 text-[10px] font-extrabold gap-1 transition-all border shadow-sm ${
                  store.activeTool === 'SEED_ARROW' && store.selectedArrowDirection === 'DOWN'
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-1 ring-emerald-300'
                    : 'bg-stone-900/80 text-stone-200 border-white/15 hover:bg-stone-800'
                }`}
                title="Flecha Abajo (↓)"
              >
                ⬇️ (↓)
              </Button>

              {/* Punto Reunión */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolSelect('SEED_SAFE_ZONE', 'ZONA_DE_SEGURIDAD')}
                className={`h-6.5 px-2 text-[10px] font-extrabold gap-1 transition-all border shadow-sm ${
                  store.activeTool === 'SEED_SAFE_ZONE'
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-1 ring-emerald-300'
                    : 'bg-stone-900/80 text-stone-200 border-white/15 hover:bg-stone-800'
                }`}
                title="Sembrar Punto de Reunión / Zona de Seguridad Exterior"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Punto Reunión
              </Button>

              {/* Botiquín / Primeros Auxilios */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolSelect('SEED_FIRST_AID', 'PRIMEROS_AUXILIOS')}
                className={`h-6.5 px-2 text-[10px] font-extrabold gap-1 transition-all border shadow-sm ${
                  store.activeTool === 'SEED_FIRST_AID'
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-1 ring-emerald-300'
                    : 'bg-stone-900/80 text-stone-200 border-white/15 hover:bg-stone-800'
                }`}
                title="Sembrar Botiquín / Estación de Primeros Auxilios"
              >
                <Plus className="w-3 h-3 text-emerald-400" /> Botiquín
              </Button>
            </div>
          </div>

          {/* Sección 2: Grid Estructurado de Parámetros Normativos NOM-026 (2 Filas Organizadas sin Empalmes) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs bg-stone-950/40 p-2.5 rounded-xl border border-white/10">
            
            {/* Fila 1 - Columna 1-2: Categoría NOM-026 */}
            <div className="space-y-1 md:col-span-2">
              <Label className="text-[10px] font-black text-stone-200 uppercase tracking-wider flex items-center gap-1 drop-shadow-sm">
                <DoorOpen className="w-3 h-3 text-emerald-400 shrink-0" /> Categoría Señal
              </Label>
              <Select
                value={store.selectedCategory}
                onValueChange={(val: NOM026SignCategory) => handleCategoryChange(val)}
              >
                <SelectTrigger className="h-7.5 bg-stone-950/80 border-white/20 text-white text-[11px] font-bold hover:bg-stone-900 shadow-sm backdrop-blur-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-950/95 border-white/20 text-white text-xs z-[100000] backdrop-blur-xl">
                  <SelectItem value="SALIDA_DE_EMERGENCIA" className="focus:bg-stone-800 font-bold">
                    🚪 SALIDA DE EMERGENCIA
                  </SelectItem>
                  <SelectItem value="RUTA_DE_EVACUACION" className="focus:bg-stone-800 font-bold">
                    ➡️ RUTA DE EVACUACIÓN
                  </SelectItem>
                  <SelectItem value="ESCALERA_DE_EMERGENCIA" className="focus:bg-stone-800 font-bold">
                    🪜 ESCALERA DE EMERGENCIA
                  </SelectItem>
                  <SelectItem value="ZONA_DE_SEGURIDAD" className="focus:bg-stone-800 font-bold">
                    🟢 ZONA DE SEGURIDAD
                  </SelectItem>
                  <SelectItem value="PRIMEROS_AUXILIOS" className="focus:bg-stone-800 font-bold">
                    ➕ PRIMEROS AUXILIOS
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fila 1 - Columna 3: Distancia de Visualización L */}
            <div className="space-y-1 md:col-span-1">
              <Label className="text-[10px] font-black text-stone-200 uppercase tracking-wider flex items-center gap-1 drop-shadow-sm">
                <Ruler className="w-3 h-3 text-emerald-400 shrink-0" /> Distancia L (m)
              </Label>
              <Select
                value={String(store.selectedViewingDistanceM)}
                onValueChange={(val) => store.setSelectedViewingDistanceM(parseInt(val, 10))}
              >
                <SelectTrigger className="h-7.5 bg-stone-950/80 border-white/20 text-white text-[11px] font-bold hover:bg-stone-900 shadow-sm backdrop-blur-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-950/95 border-white/20 text-white text-xs z-[100000] backdrop-blur-xl">
                  <SelectItem value="5" className="focus:bg-stone-800 font-bold">5 m (125 cm² - 15.8x7.9cm)</SelectItem>
                  <SelectItem value="10" className="focus:bg-stone-800 font-bold">10 m (500 cm² - 31.6x15.8cm)</SelectItem>
                  <SelectItem value="15" className="focus:bg-stone-800 font-bold">15 m (1,125 cm² - 47.4x23.7cm)</SelectItem>
                  <SelectItem value="20" className="focus:bg-stone-800 font-bold">20 m (2,000 cm² - 63.2x31.6cm)</SelectItem>
                  <SelectItem value="30" className="focus:bg-stone-800 font-bold">30 m (4,500 cm² - 94.9x47.4cm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fila 1 - Columna 4: Dirección de Flecha */}
            <div className="space-y-1 md:col-span-1">
              <Label className="text-[10px] font-black text-stone-200 uppercase tracking-wider flex items-center gap-1 drop-shadow-sm">
                <Compass className="w-3 h-3 text-emerald-400 shrink-0" /> Flecha
              </Label>
              <Select
                value={store.selectedArrowDirection}
                onValueChange={(val: ArrowDirection) => store.setSelectedArrowDirection(val)}
              >
                <SelectTrigger className="h-7.5 bg-stone-950/80 border-white/20 text-white text-[11px] font-bold hover:bg-stone-900 shadow-sm backdrop-blur-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-950/95 border-white/20 text-white text-xs z-[100000] backdrop-blur-xl">
                  <SelectItem value="RIGHT" className="focus:bg-stone-800 font-bold">➡️ Derecha (→)</SelectItem>
                  <SelectItem value="LEFT" className="focus:bg-stone-800 font-bold">⬅️ Izquierda (←)</SelectItem>
                  <SelectItem value="UP" className="focus:bg-stone-800 font-bold">⬆️ Arriba (↑)</SelectItem>
                  <SelectItem value="DOWN" className="focus:bg-stone-800 font-bold">⬇️ Abajo (↓)</SelectItem>
                  <SelectItem value="UP_RIGHT" className="focus:bg-stone-800 font-bold">↗️ Diagonal Arriba-Der (↗)</SelectItem>
                  <SelectItem value="UP_LEFT" className="focus:bg-stone-800 font-bold">↖️ Diagonal Arriba-Izq (↖)</SelectItem>
                  <SelectItem value="DOWN_RIGHT" className="focus:bg-stone-800 font-bold">↘️ Diagonal Abajo-Der (↘)</SelectItem>
                  <SelectItem value="DOWN_LEFT" className="focus:bg-stone-800 font-bold">↙️ Diagonal Abajo-Izq (↙)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fila 2 - Columna 1-2: Soporte y Montaje */}
            <div className="space-y-1 md:col-span-2">
              <Label className="text-[10px] font-black text-stone-200 uppercase tracking-wider flex items-center gap-1 drop-shadow-sm">
                <Layers className="w-3 h-3 text-emerald-400 shrink-0" /> Tipo Soporte / Montaje
              </Label>
              <Select
                value={store.selectedMountingType}
                onValueChange={(val: SignMountingType) => store.setSelectedMountingType(val)}
              >
                <SelectTrigger className="h-7.5 bg-stone-950/80 border-white/20 text-white text-[11px] font-bold hover:bg-stone-900 shadow-sm backdrop-blur-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-950/95 border-white/20 text-white text-xs z-[100000] backdrop-blur-xl">
                  <SelectItem value="SOBRE_PUERTA" className="focus:bg-stone-800 font-bold">Sobre Puerta (1.60m-2.20m)</SelectItem>
                  <SelectItem value="ADHERIDO_PARED" className="focus:bg-stone-800 font-bold">Adherido Pared (2.20m)</SelectItem>
                  <SelectItem value="TIPO_BANDERA" className="focus:bg-stone-800 font-bold">Tipo Bandera (2.50m)</SelectItem>
                  <SelectItem value="COLGANTE_TECHO" className="focus:bg-stone-800 font-bold">Colgante Techo (2.50m)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fila 2 - Columna 3-4: Material de Señal */}
            <div className="space-y-1 md:col-span-2">
              <Label className="text-[10px] font-black text-stone-200 uppercase tracking-wider flex items-center gap-1 drop-shadow-sm">
                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" /> Material de Señal
              </Label>
              <Select
                value={store.selectedMaterial}
                onValueChange={(val: SignMaterial) => store.setSelectedMaterial(val)}
              >
                <SelectTrigger className="h-7.5 bg-stone-950/80 border-white/20 text-white text-[11px] font-bold hover:bg-stone-900 shadow-sm backdrop-blur-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-950/95 border-white/20 text-white text-xs z-[100000] backdrop-blur-xl">
                  <SelectItem value="ACRILICO_FOTOLUMINISCENTE" className="focus:bg-stone-800 font-bold">Acrílico Fotoluminiscente</SelectItem>
                  <SelectItem value="VINILO_ADHERIBLE" className="focus:bg-stone-800 font-bold">Vinilo Adherible</SelectItem>
                  <SelectItem value="ALUMINIO_FOTOLUMINISCENTE" className="focus:bg-stone-800 font-bold">Aluminio Fotoluminiscente</SelectItem>
                  <SelectItem value="ESTRUCTURA_BANDERA" className="focus:bg-stone-800 font-bold">Estructura Doble Vista</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Sección 3: Altura de Montaje, Dimensión Mínima Calculada e Info Normativa */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/15 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-stone-950/60 px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
                <Label className="text-[10px] text-stone-300 font-bold">Altura Montaje:</Label>
                <Input
                  type="number"
                  step="0.05"
                  min="1.50"
                  max="2.80"
                  value={store.mountingHeightDefault}
                  onChange={(e) => store.setMountingHeightDefault(parseFloat(e.target.value) || 2.20)}
                  className="w-16 h-6 bg-stone-950/90 border-white/20 text-white text-xs font-mono font-bold text-center px-1"
                />
                <span className="text-[10px] text-stone-300 font-bold">m del piso</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="border-emerald-400/60 bg-emerald-950/90 text-emerald-200 text-[10px] px-2.5 py-1 font-mono font-bold shadow-sm"
                >
                  Dimensión Mínima NOM-026: {dims.widthCm} x {dims.heightCm} cm ({dims.surfaceCm2} cm²)
                </Badge>
              </div>
            </div>

            {/* Badge Info Fórmula Normativa */}
            <div className="flex items-center gap-1.5 bg-stone-950/70 px-2.5 py-1 rounded-lg border border-white/15 text-[10px] shadow-sm">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-stone-200 font-bold truncate max-w-[340px]">
                Fórmula: <strong className="text-emerald-300 font-extrabold">S ≥ L²/2000</strong> (Verde #00A651 ≥50%, Blanco #FFFFFF)
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
