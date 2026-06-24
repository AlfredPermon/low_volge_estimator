'use client';

import { Settings2, Info, Percent, Ruler } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { useEstimateStore, type EstimateFactors } from '@/store/estimate-store';

export default function FactorsPanel() {
  const factors = useEstimateStore((s) => s.factors);
  const setFactors = useEstimateStore((s) => s.setFactors);

  const updateField = (key: keyof EstimateFactors, rawValue: string, transform?: (v: number) => number) => {
    const num = parseFloat(rawValue);
    if (isNaN(num)) return;
    const value = transform ? transform(num) : num;
    setFactors({ ...factors, [key]: value });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-stone-700">
            <Settings2 className="w-4 h-4 text-emerald-600" />
            Factores de Cálculo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Waste Cable */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Desperdicio Cable
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-stone-400" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Porcentaje de material adicional por cortes, desperdicios y residuos en tendido de cable.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Percent className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={(factors.wasteFactorCable * 100).toFixed(0)}
              onChange={(e) => updateField('wasteFactorCable', e.target.value, (v) => v / 100)}
              className="h-8 text-sm"
            />
          </div>

          {/* Waste Conduit */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Desperdicio Canalización
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-stone-400" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Porcentaje adicional por corte de conduit, codos y accesorios de canalización.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Percent className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={(factors.wasteFactorConduit * 100).toFixed(0)}
              onChange={(e) => updateField('wasteFactorConduit', e.target.value, (v) => v / 100)}
              className="h-8 text-sm"
            />
          </div>

          <Separator className="my-2" />

          {/* Vertical Drop */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Bajada Vertical
              </Label>
              <span className="text-xs text-stone-400">m</span>
            </div>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={factors.verticalDrop}
              onChange={(e) => updateField('verticalDrop', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Rack Allowance */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Holgura en Rack
              </Label>
              <span className="text-xs text-stone-400">m</span>
            </div>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={factors.rackAllowance}
              onChange={(e) => updateField('rackAllowance', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <Separator className="my-2" />

          {/* Indirect Factor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Costos Indirectos
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-stone-400" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Gastos administrativos, supervisión, seguros, financieros y otros costos no directamente atribuibles a la instalación.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Percent className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={(factors.indirectFactor * 100).toFixed(0)}
              onChange={(e) => updateField('indirectFactor', e.target.value, (v) => v / 100)}
              className="h-8 text-sm"
            />
          </div>

          {/* Utility Factor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Utilidad
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-stone-400" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Margen de utilidad y financiamiento del proyecto.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Percent className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={(factors.utilityFactor * 100).toFixed(0)}
              onChange={(e) => updateField('utilityFactor', e.target.value, (v) => v / 100)}
              className="h-8 text-sm"
            />
          </div>

          <Separator className="my-3" />

          {/* Formulas */}
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-medium text-stone-600 flex items-center gap-1">
              <Ruler className="w-3 h-3" />
              Fórmulas de Cálculo
            </p>
            <div className="bg-stone-50 rounded-md p-3 space-y-1.5">
              <p className="text-[11px] text-stone-500 font-mono">
                L_cable = (Dist + Bajada + Holgura) × Qty × (1 + F_desp)
              </p>
              <p className="text-[11px] text-stone-500 font-mono">
                L_canal = Dist × Qty × (1 + F_canal)
              </p>
              <p className="text-[11px] text-stone-500 font-mono">
                C_total = (Mat + MO + Ing) × (1 + Ind) × (1 + Util)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}