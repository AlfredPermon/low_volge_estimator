'use client';

import React from 'react';
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
  ShieldAlert,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Layers,
  Ruler,
  FileCheck,
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

interface ExtinguisherSeedToolbarProps {
  onOpenSummarySheet?: () => void;
}

export function ExtinguisherSeedToolbar({ onOpenSummarySheet }: ExtinguisherSeedToolbarProps) {
  const store = useFireStore();

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
    <div className="bg-stone-900/95 backdrop-blur-md border border-stone-800 text-stone-100 p-4 rounded-xl shadow-2xl space-y-4 select-none">
      {/* Header Capa EXTINGUISHER SEED */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-orange-950/80 border border-orange-500/50 rounded-lg text-orange-400">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-orange-400">Capa Activa</span>
              <Badge variant="outline" className="border-orange-500/50 bg-orange-950/60 text-orange-300 text-[10px] px-1.5 py-0 font-mono">
                EXTINGUISHER SEED
              </Badge>
            </div>
            <h4 className="text-sm font-bold text-white">Sembrado 2D de Extintores (NOM-002/016/026)</h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Radio Cobertura */}
          <Button
            variant="outline"
            size="sm"
            onClick={store.toggleShowCoverageRadii}
            className={`h-8 text-xs gap-1.5 font-semibold transition-all ${
              store.showCoverageRadii
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600 hover:bg-emerald-900'
                : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'
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
              onClick={onOpenSummarySheet}
              className="h-8 text-xs bg-orange-600 hover:bg-orange-500 text-white font-bold gap-1.5 border border-orange-400 shadow-sm"
            >
              <FileCheck className="w-3.5 h-3.5" /> Resumen & Cuantificación
            </Button>
          )}
        </div>
      </div>

      {/* Controles de Selección de Parámetros Normativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        
        {/* 1. Selector de Área Médica Hospitalaria (NOM-016-SSA3-2012) */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" /> Área Médica Hospitalaria
          </Label>
          <Select value={store.selectedMedicalArea} onValueChange={handleMedicalAreaChange}>
            <SelectTrigger className="h-8 bg-stone-800 border-stone-700 text-white text-xs font-semibold">
              <SelectValue placeholder="Seleccione área médica" />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-800 text-white text-xs">
              {Object.values(MEDICAL_AREAS).map((area) => (
                <SelectItem key={area.id} value={area.id} className="focus:bg-stone-800 focus:text-white">
                  <span className="font-semibold">{area.name}</span>
                  <span className="ml-2 text-[10px] text-stone-400 font-mono">
                    ({area.riskZone === 'HIGH_RISK' ? 'Alto Riesgo 15m' : 'Riesgo Ord. 30m'})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 2. Selector de Agente Extintor */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" /> Tipo de Extintor
          </Label>
          <Select value={store.selectedType} onValueChange={(val: ExtinguisherType) => handleTypeChange(val)}>
            <SelectTrigger className="h-8 bg-stone-800 border-stone-700 text-white text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-800 text-white text-xs">
              {(Object.keys(AGENT_COLORS) as ExtinguisherType[]).map((t) => (
                <SelectItem key={t} value={t} className="focus:bg-stone-800 focus:text-white py-1">
                  <div className="flex items-center gap-2">
                    <ExtinguisherClassIcon agentType={t} size={22} />
                    <span className="font-semibold">{AGENT_COLORS[t].label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. Selector de Capacidad Comercial */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-orange-400" /> Capacidad Comercial
          </Label>
          <Select value={store.selectedCapacity} onValueChange={(val: ExtinguisherCapacity) => store.setSelectedCapacity(val)}>
            <SelectTrigger className="h-8 bg-stone-800 border-stone-700 text-white text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-800 text-white text-xs">
              {(TYPE_CAPACITIES[store.selectedType] || ['5lbs', '6.0kg']).map((cap) => (
                <SelectItem key={cap} value={cap} className="focus:bg-stone-800 focus:text-white">
                  {cap}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 4. Zona de Riesgo y Radio de Cobertura */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
            <Ruler className="w-3.5 h-3.5 text-orange-400" /> Zona de Riesgo (NOM-002)
          </Label>
          <Select value={store.selectedRiskZone} onValueChange={(val: HospitalRiskZone) => store.setSelectedRiskZone(val)}>
            <SelectTrigger className="h-8 bg-stone-800 border-stone-700 text-white text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-800 text-white text-xs">
              <SelectItem value="HIGH_RISK" className="focus:bg-stone-800">
                🔴 Alto Riesgo (Recorrido 15 m)
              </SelectItem>
              <SelectItem value="ORDINARY_RISK" className="focus:bg-stone-800">
                🟡 Riesgo Ordinario (Recorrido 30 m)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 5. Modo de Visualización del Radio */}
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Modo de Radio Visual
          </Label>
          <Select
            value={store.radiusDisplayMode || 'EFFECTIVE_2D'}
            onValueChange={(val: 'EFFECTIVE_2D' | 'MAX_TRAVEL_NOM') => store.setRadiusDisplayMode(val)}
          >
            <SelectTrigger className="h-8 bg-stone-800 border-stone-700 text-white text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-800 text-white text-xs">
              <SelectItem value="EFFECTIVE_2D" className="focus:bg-stone-800">
                🟢 Radio Efectivo 2D (7.5m / 15m)
              </SelectItem>
              <SelectItem value="MAX_TRAVEL_NOM" className="focus:bg-stone-800">
                🔴 Recorrido Máximo NOM (15m / 30m)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      {/* Alturas de Montaje y Señalización */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-stone-800 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-[11px] text-stone-400">Altura Montaje (NOM-002):</Label>
            <Input
              type="number"
              step="0.05"
              min="0.50"
              max="2.00"
              value={store.mountingHeightDefault}
              onChange={(e) => store.setMountingHeightDefault(parseFloat(e.target.value) || 1.50)}
              className="w-20 h-7 bg-stone-800 border-stone-700 text-white text-xs font-mono text-center"
            />
            <span className="text-[11px] text-stone-400">m (máx 1.50m)</span>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-[11px] text-stone-400">Señalización (NOM-026):</Label>
            <Input
              type="number"
              step="0.05"
              min="1.50"
              max="2.20"
              value={store.signalingHeightDefault}
              onChange={(e) => store.setSignalingHeightDefault(parseFloat(e.target.value) || 1.90)}
              className="w-20 h-7 bg-stone-800 border-stone-700 text-white text-xs font-mono text-center"
            />
            <span className="text-[11px] text-stone-400">m (1.80m-2.00m)</span>
          </div>
        </div>

        {/* Info Badge de Compatibilidad Normativa */}
        <div className="flex items-center gap-2 bg-stone-800/90 px-3 py-1.5 rounded-lg border border-stone-700 text-[11px]">
          <Info className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="text-stone-300">
            {selectedAreaConfig.name}: <strong className="text-orange-300">{selectedAreaConfig.recommendedType}</strong> recomendado.
          </span>
        </div>
      </div>
    </div>
  );
}
