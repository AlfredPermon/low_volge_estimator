'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFireStore } from '@/store/useFireStore';
import {
  ExtinguisherType,
  ExtinguisherCapacity,
  HospitalRiskZone,
} from '@/types/fireProtection';
import { MEDICAL_AREAS } from '@/lib/fireNormativeValidator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Flame,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Layers,
  Ruler,
  FileCheck,
  BarChart3,
  ChevronDown,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { ExtinguisherClassIcon } from './ExtinguisherClassIcon';

const AGENT_COLORS: Record<ExtinguisherType, { bg: string; text: string; border: string; label: string }> = {
  PQS_ABC: { bg: 'bg-red-600', text: 'text-red-100', border: 'border-red-500', label: 'PQS (Polvo Químico Seco - Clase A/B/C)' },
  CO2: { bg: 'bg-blue-600', text: 'text-blue-100', border: 'border-blue-500', label: 'CO₂ (Dióxido de Carbono - Clase B/C)' },
  CLEAN_AGENT: { bg: 'bg-purple-600', text: 'text-purple-100', border: 'border-purple-500', label: 'Agente Limpio HFC / Halotrón (Clase A/B/C)' },
  WATER_PRESSURIZED: { bg: 'bg-emerald-600', text: 'text-emerald-100', border: 'border-emerald-500', label: 'Agua a Presión (Clase A)' },
  AFFF: { bg: 'bg-teal-600', text: 'text-teal-100', border: 'border-teal-500', label: 'Espuma Mecánica AFFF (Clase A/B)' },
  CLASS_K: { bg: 'bg-stone-900', text: 'text-stone-100', border: 'border-stone-700', label: 'Clase K (Acetato de Potasio - Cocina)' },
};

const TYPE_CAPACITIES: Record<ExtinguisherType, ExtinguisherCapacity[]> = {
  PQS_ABC: ['2.5kg', '4.5kg', '6.0kg', '10.0kg'],
  CO2: ['2.5kg', '4.5kg', '6.0kg', '10.0kg'],
  CLEAN_AGENT: ['2.5kg', '4.6kg', '6.0kg', '10.0kg'],
  WATER_PRESSURIZED: ['6.0kg', '10.0kg', '6L', '9.5L'],
  AFFF: ['4.5kg', '6.0kg', '10.0kg'],
  CLASS_K: ['6L', '10L', '6.0L', '9.0L'],
};

interface ExtinguisherFloatingToolbarProps {
  onOpenSummarySheet?: () => void;
}

export function ExtinguisherFloatingToolbar({ onOpenSummarySheet }: ExtinguisherFloatingToolbarProps) {
  const store = useFireStore();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Ocultar panel automáticamente al hacer clic en cualquier parte fuera de la barra flotante (ej. en el canvas)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const isInsideToolbar = toolbarRef.current?.contains(target);
      const isInsidePortal = target.closest('[role="listbox"], [data-radix-popper-content-wrapper], [data-radix-select-content]');

      if (!isInsideToolbar && !isInsidePortal) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMedicalAreaChange = (areaKey: string) => {
    store.setSelectedMedicalArea(areaKey);
    const areaInfo = MEDICAL_AREAS[areaKey];
    if (areaInfo) {
      toast.info(
        `Área médica: ${areaInfo.name}. Tipo normativo asignado: ${areaInfo.recommendedType} (${
          areaInfo.riskZone === 'HIGH_RISK' ? 'Alto Riesgo 15m' : 'Riesgo Ordinario 30m'
        })`,
        { icon: '🧯' }
      );
    }
  };

  const handleTypeChange = (type: ExtinguisherType) => {
    store.setSelectedType(type);
    const validCapacities = TYPE_CAPACITIES[type];
    if (validCapacities && !validCapacities.includes(store.selectedCapacity)) {
      store.setSelectedCapacity(validCapacities[0]);
    }
  };

  const selectedAreaConfig = MEDICAL_AREAS[store.selectedMedicalArea] || MEDICAL_AREAS.pasillo;

  return (
    <div ref={toolbarRef} className="absolute top-4 left-4 z-40 pointer-events-auto select-none font-sans">
      {/* ─── Botón Flotante Activador Esquina Superior Izquierda (Vidrio Translúcido con Máxima Claridad de Texto) ─── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-2xl shadow-2xl border transition-all duration-300 backdrop-blur-md ${
          isOpen
            ? 'bg-stone-950/65 text-white border-orange-400/90 ring-2 ring-orange-500/50'
            : 'bg-stone-950/45 hover:bg-stone-950/65 text-stone-100 border-white/30 hover:border-orange-400/60 shadow-black/40'
        }`}
        title="Desplegar Herramientas de Capa Activa EXTINGUISHER SEED"
      >
        <div className="p-1 bg-orange-950/90 border border-orange-500/80 rounded-lg text-orange-400 shrink-0 shadow-md">
          <Flame className="w-4 h-4 animate-pulse" />
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              Capa Activa
            </span>
            <Badge variant="outline" className="border-orange-400/60 bg-orange-950/80 text-orange-200 text-[9px] px-1 py-0 font-mono font-bold shadow-sm">
              SEED
            </Badge>
          </div>
          <span className="text-xs font-black text-white tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            EXTINGUISHER SEED
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-stone-200 transition-transform duration-300 ml-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
            isOpen ? 'rotate-180 text-orange-400' : 'group-hover:text-white'
          }`}
        />
      </button>

      {/* ─── Panel Flotante Desplegable Vertical (Vidrio Translúcido con Textos Oscuros/Contrastados de Alta Legibilidad) ─── */}
      <div
        className={`absolute top-13 left-0 w-[840px] max-w-[calc(100vw-2rem)] transition-all duration-300 ease-out origin-top-left ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-3 pointer-events-none'
        }`}
      >
        <div className="bg-stone-950/50 backdrop-blur-md border border-white/25 text-stone-100 p-4 rounded-2xl shadow-2xl space-y-4 backdrop-saturate-150">
          
          {/* Header del Panel Flotante */}
          <div className="flex items-center justify-between pb-3 border-b border-white/15">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-stone-950/80 border border-orange-500/70 rounded-xl text-orange-400 shadow-md">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white flex items-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                  <span>Sembrado 2D de Extintores (NOM-002/016/026)</span>
                  <Badge variant="outline" className="border-orange-400/70 bg-orange-950/80 text-orange-200 text-[9px] font-bold">
                    FLOTANTE
                  </Badge>
                </h4>
                <p className="text-[10px] font-semibold text-stone-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Configuración rápida de parámetros normativos sobre el canvas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Radios de Cobertura */}
              <Button
                variant="outline"
                size="sm"
                onClick={store.toggleShowCoverageRadii}
                className={`h-7 text-[11px] gap-1.5 font-bold transition-all border shadow-md ${
                  store.showCoverageRadii
                    ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/90 hover:bg-emerald-900/90'
                    : 'bg-stone-950/70 text-stone-300 border-white/20 hover:bg-stone-900/80'
                }`}
                title="Mostrar u ocultar círculos translúcidos de radio de cobertura de 15m / 30m"
              >
                {store.showCoverageRadii ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-400" /> Radios 15m/30m On
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> Radios Ocultos
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
                  className="h-7 text-[11px] bg-orange-600 hover:bg-orange-500 text-white font-extrabold gap-1.5 border border-orange-400 shadow-md drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                >
                  <FileCheck className="w-3.5 h-3.5" /> Resumen & Cuantificación
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

          {/* Grid de Controles de Selección de Parámetros Normativos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            
            {/* 1. Selector de Área Médica Hospitalaria (NOM-016-SSA3-2012) */}
            <div className="space-y-1">
              <Label className="text-[11px] font-black text-stone-100 flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-400 shrink-0 drop-shadow-sm" /> Área Médica Hospitalaria
              </Label>
              <Select value={store.selectedMedicalArea} onValueChange={handleMedicalAreaChange}>
                <SelectTrigger className="h-8 bg-stone-950/60 border-white/20 text-white text-xs font-extrabold hover:bg-stone-950/80 shadow-md backdrop-blur-md">
                  <SelectValue placeholder="Seleccione área médica" />
                </SelectTrigger>
                <SelectContent className="bg-stone-950/95 border-white/20 text-white text-xs z-50 backdrop-blur-xl">
                  {Object.values(MEDICAL_AREAS).map((area) => (
                    <SelectItem key={area.id} value={area.id} className="focus:bg-stone-800 focus:text-white">
                      <span className="font-bold">{area.name}</span>
                      <span className="ml-1.5 text-[10px] text-stone-300 font-mono">
                        ({area.riskZone === 'HIGH_RISK' ? 'Alto Riesgo 15m' : 'Riesgo Ord. 30m'})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Selector de Agente Extintor */}
            <div className="space-y-1">
              <Label className="text-[11px] font-black text-stone-100 flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0 drop-shadow-sm" /> Tipo de Extintor
              </Label>
              <Select value={store.selectedType} onValueChange={(val: ExtinguisherType) => handleTypeChange(val)}>
                <SelectTrigger className="h-8 bg-stone-950/60 border-white/20 text-white text-xs font-extrabold hover:bg-stone-950/80 shadow-md backdrop-blur-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-950/95 border-white/20 text-white text-xs z-50 backdrop-blur-xl">
                  {(Object.keys(AGENT_COLORS) as ExtinguisherType[]).map((t) => (
                    <SelectItem key={t} value={t} className="focus:bg-stone-800 focus:text-white py-1">
                      <div className="flex items-center gap-2">
                        <ExtinguisherClassIcon agentType={t} size={20} />
                        <span className="font-bold">{AGENT_COLORS[t].label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Selector de Capacidad Comercial */}
            <div className="space-y-1">
              <Label className="text-[11px] font-black text-stone-100 flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                <Layers className="w-3.5 h-3.5 text-orange-400 shrink-0 drop-shadow-sm" /> Capacidad Comercial
              </Label>
              <Select value={store.selectedCapacity} onValueChange={(val: ExtinguisherCapacity) => store.setSelectedCapacity(val)}>
                <SelectTrigger className="h-8 bg-stone-950/60 border-white/20 text-white text-xs font-extrabold hover:bg-stone-950/80 shadow-md backdrop-blur-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-950/95 border-white/20 text-white text-xs z-50 backdrop-blur-xl">
                  {(TYPE_CAPACITIES[store.selectedType] || ['5lbs', '6.0kg']).map((cap) => (
                    <SelectItem key={cap} value={cap} className="focus:bg-stone-800 focus:text-white font-bold">
                      {cap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Zona de Riesgo y Radio de Cobertura */}
            <div className="space-y-1">
              <Label className="text-[11px] font-black text-stone-100 flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                <Ruler className="w-3.5 h-3.5 text-orange-400 shrink-0 drop-shadow-sm" /> Zona de Riesgo (NOM-002)
              </Label>
              <Select value={store.selectedRiskZone} onValueChange={(val: HospitalRiskZone) => store.setSelectedRiskZone(val)}>
                <SelectTrigger className="h-8 bg-stone-950/60 border-white/20 text-white text-xs font-extrabold hover:bg-stone-950/80 shadow-md backdrop-blur-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-950/95 border-white/20 text-white text-xs z-50 backdrop-blur-xl">
                  <SelectItem value="HIGH_RISK" className="focus:bg-stone-800 font-bold">
                    🔴 Alto Riesgo (Recorrido 15 m)
                  </SelectItem>
                  <SelectItem value="ORDINARY_RISK" className="focus:bg-stone-800 font-bold">
                    🟡 Riesgo Ordinario (Recorrido 30 m)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 5. Modo de Visualización del Radio */}
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-[11px] font-black text-stone-100 flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 drop-shadow-sm" /> Modo de Radio Visual
              </Label>
              <Select
                value={store.radiusDisplayMode || 'EFFECTIVE_2D'}
                onValueChange={(val: 'EFFECTIVE_2D' | 'MAX_TRAVEL_NOM') => store.setRadiusDisplayMode(val)}
              >
                <SelectTrigger className="h-8 bg-stone-950/60 border-white/20 text-white text-xs font-extrabold hover:bg-stone-950/80 shadow-md backdrop-blur-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-stone-950/95 border-white/20 text-white text-xs z-50 backdrop-blur-xl">
                  <SelectItem value="EFFECTIVE_2D" className="focus:bg-stone-800 font-bold">
                    🟢 Radio Efectivo 2D (7.5m / 15m)
                  </SelectItem>
                  <SelectItem value="MAX_TRAVEL_NOM" className="focus:bg-stone-800 font-bold">
                    🔴 Recorrido Máximo NOM (15m / 30m)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Alturas de Montaje, Señalización e Info Normativa */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/15 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-stone-950/50 px-2 py-1 rounded-lg border border-white/10 shadow-sm">
                <Label className="text-[10px] text-stone-300 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">Montaje (NOM-002):</Label>
                <Input
                  type="number"
                  step="0.05"
                  min="0.50"
                  max="2.00"
                  value={store.mountingHeightDefault}
                  onChange={(e) => store.setMountingHeightDefault(parseFloat(e.target.value) || 1.50)}
                  className="w-16 h-6 bg-stone-950/80 border-white/20 text-white text-xs font-mono font-bold text-center px-1"
                />
                <span className="text-[10px] text-stone-300 font-bold">m</span>
              </div>

              <div className="flex items-center gap-1.5 bg-stone-950/50 px-2 py-1 rounded-lg border border-white/10 shadow-sm">
                <Label className="text-[10px] text-stone-300 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">Señal (NOM-026):</Label>
                <Input
                  type="number"
                  step="0.05"
                  min="1.50"
                  max="2.20"
                  value={store.signalingHeightDefault}
                  onChange={(e) => store.setSignalingHeightDefault(parseFloat(e.target.value) || 1.90)}
                  className="w-16 h-6 bg-stone-950/80 border-white/20 text-white text-xs font-mono font-bold text-center px-1"
                />
                <span className="text-[10px] text-stone-300 font-bold">m</span>
              </div>
            </div>

            {/* Badge de Recomendación Normativa con Contraste Oscuro Legible */}
            <div className="flex items-center gap-1.5 bg-stone-950/70 px-2.5 py-1 rounded-lg border border-white/15 text-[10px] shadow-sm">
              <Info className="w-3 h-3 text-orange-400 shrink-0" />
              <span className="text-stone-200 font-bold truncate max-w-[240px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                {selectedAreaConfig.name}: <strong className="text-orange-300 font-extrabold">{selectedAreaConfig.recommendedType}</strong>
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
