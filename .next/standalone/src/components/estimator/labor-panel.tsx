'use client';

import { HardHat, Info, Clock } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { useEstimateStore } from '@/store/estimate-store';
import { averageHourlyRate } from '@/lib/labor-calculator';

/**
 * Panel de Mano de Obra (TASK §9.5, §14.4).
 *
 * Permite editar:
 *  - Tarifas por hora-hombre (Técnico / Oficial / Ayudante)
 *  - Activar/desactivar el modelo de cálculo por cuadrilla
 *
 * Las plantillas de cuadrilla por tipo de dispositivo se configuran
 * desde el catálogo de precios (PriceItem.crewTechnician, etc.).
 */
export default function LaborPanel() {
  const factors = useEstimateStore((s) => s.factors);
  const setFactors = useEstimateStore((s) => s.setFactors);

  const updateRate = (key: 'technician' | 'officer' | 'helper', raw: string) => {
    const num = parseFloat(raw);
    if (isNaN(num) || num < 0) return;
    setFactors({
      ...factors,
      laborRates: { ...factors.laborRates, [key]: num },
    });
  };

  const avg = averageHourlyRate(factors.laborRates);
  const total = factors.laborRates.technician + factors.laborRates.officer + factors.laborRates.helper;

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-semibold text-stone-700">
            <span className="flex items-center gap-2">
              <HardHat className="w-4 h-4 text-amber-600" />
              Mano de Obra
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              Prom: ${avg.toFixed(2)}/h
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Toggle: cálculo por cuadrilla */}
          <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="crew-toggle" className="text-xs font-medium text-stone-700 flex items-center gap-1">
                Modelo por Cuadrilla
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-stone-400" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Activa el cálculo de mano de obra usando cuadrilla
                    (Técnicos + Oficiales + Ayudantes × horas-hombre) definido
                    en cada precio del catálogo.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Usa la cuadrilla del PriceItem en lugar del costo unitario plano.
              </p>
            </div>
            <Switch
              id="crew-toggle"
              checked={factors.useCrewBasedLabor}
              onCheckedChange={(v) =>
                setFactors({ ...factors, useCrewBasedLabor: v })
              }
            />
          </div>

          <Separator />

          {/* Tarifas por hora-hombre */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-stone-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Tarifas por Hora-Hombre
            </p>

            <div className="grid grid-cols-1 gap-2">
              <RateInput
                label="Técnico"
                hint="MXN/hr"
                value={factors.laborRates.technician}
                onChange={(v) => updateRate('technician', v)}
              />
              <RateInput
                label="Oficial"
                hint="MXN/hr"
                value={factors.laborRates.officer}
                onChange={(v) => updateRate('officer', v)}
              />
              <RateInput
                label="Ayudante"
                hint="MXN/hr"
                value={factors.laborRates.helper}
                onChange={(v) => updateRate('helper', v)}
              />
            </div>
          </div>

          <Separator />

          {/* Suma de tarifas */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Suma de tarifas</span>
            <span className="font-mono font-semibold">
              ${total.toFixed(2)}/h
            </span>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function RateInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-[10px] text-stone-400 font-mono">{hint}</span>
      </div>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );
}
