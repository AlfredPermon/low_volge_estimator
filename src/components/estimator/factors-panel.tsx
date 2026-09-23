'use client';

import { useEffect, useRef, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { useEstimateStore, type EstimateFactors } from '@/store/estimate-store';
import { toast } from 'sonner';

export default function FactorsPanel() {
  const factors = useEstimateStore((s) => s.factors);
  const setFactors = useEstimateStore((s) => s.setFactors);
  const estimateId = useEstimateStore((s) => s.estimateId);
  const factorsNotes = useEstimateStore((s) => s.factorsNotes);
  const setFactorsNotes = useEstimateStore((s) => s.setFactorsNotes);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const lastSavedValue = useRef<string>(factorsNotes);

  const updateField = (key: keyof EstimateFactors, rawValue: string, transform?: (v: number) => number) => {
    const num = parseFloat(rawValue);
    if (isNaN(num)) return;
    const value = transform ? transform(num) : num;
    setFactors({ ...factors, [key]: value });
  };

  const saveNotes = async (opts?: { silent?: boolean }) => {
    if (!estimateId) {
      if (!opts?.silent) toast.error('Guarda el presupuesto para poder guardar las notas');
      return;
    }
    if (saving) return;
    const current = factorsNotes ?? '';
    if (current === lastSavedValue.current) {
      if (!opts?.silent) toast.info('No hay cambios por guardar');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorsNotes: current.slice(0, 2000), forceRecalc: false }),
      });
      if (!res.ok) throw new Error('save failed');
      lastSavedValue.current = current;
      setLastSavedAt(Date.now());
      if (!opts?.silent) toast.success('Notas guardadas');
    } catch {
      if (!opts?.silent) toast.error('Error al guardar notas');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!estimateId) return;
    const id = window.setInterval(() => {
      void saveNotes({ silent: true });
    }, 30_000);
    return () => window.clearInterval(id);
  }, [estimateId, factorsNotes]);

  useEffect(() => {
    if (factorsNotes === lastSavedValue.current) return;
    if (lastSavedValue.current === undefined) lastSavedValue.current = factorsNotes;
  }, [factorsNotes]);

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

          {/* IVA Rate (TASK §9.1) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                IVA
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-stone-400" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Tasa de Impuesto al Valor Agregado aplicada al Gran Total. Default 16% (México).
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
              value={(factors.ivaRate * 100).toFixed(0)}
              onChange={(e) => updateField('ivaRate', e.target.value, (v) => v / 100)}
              className="h-8 text-sm"
            />
          </div>

          {/* Rounding Policy (TASK §10) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                Decimales
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-stone-400" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Política de redondeo: número de decimales aplicados a los importes.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <span className="text-xs text-stone-400">0-4</span>
            </div>
            <Input
              type="number"
              min={0}
              max={4}
              step={1}
              value={factors.roundingPolicy}
              onChange={(e) => {
                const num = Math.floor(Number(e.target.value));
                if (Number.isFinite(num)) {
                  setFactors({ ...factors, roundingPolicy: Math.max(0, Math.min(4, num)) as 0 | 1 | 2 | 3 | 4 });
                }
              }}
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
                C_total = (Mat + MO + Ing) × (1 + Ind)
              </p>
              <p className="text-[11px] text-stone-500 font-mono">
                Total con IVA = C_total × (1 + IVA)
              </p>
            </div>
          </div>

          <Separator className="my-3" />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs font-medium text-stone-600">Notas</Label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {(factorsNotes?.length ?? 0)}/2000
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void saveNotes()}
                  disabled={saving}
                  className="h-8 border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Guardar
                </Button>
              </div>
            </div>
            <Textarea
              value={factorsNotes}
              onChange={(e) => setFactorsNotes(e.target.value.slice(0, 2000))}
              maxLength={2000}
              placeholder="Notas técnicas, supuestos, alcances, restricciones, recomendaciones…"
              className="min-h-28 text-sm"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Guardado automático cada 30 segundos</span>
              <span>
                {lastSavedAt ? `Último guardado: ${new Date(lastSavedAt).toLocaleTimeString('es-MX')}` : '—'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
