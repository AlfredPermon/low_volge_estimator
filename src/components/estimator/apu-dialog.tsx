'use client';

/**
 * D2 - Análisis de Precio Unitario (APU) por línea (TASK §17.2).
 *
 * Modal que muestra el desglose de cómo se compone el precio unitario de una
 * partida, aplicando los factores del proyecto (indirecto, IVA):
 *
 *   PU base (Costo Directo Unitario) = materialUnit + laborUnit + engineeringUnit
 *   Indirectos Unitarios              = PU base × indirectFactor
 *   PU sin IVA                        = PU base + Indirectos
 *   IVA                               = PU sin IVA × ivaRate
 *   PU con IVA                        = PU sin IVA + IVA
 */

import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { LineItem } from '@/store/estimate-store';
import type { EstimateFactors } from '@/store/estimate-store';

interface ApuDialogProps {
  item: LineItem;
  factors: EstimateFactors;
  currency: 'MXN' | 'USD';
  systemLabel?: string;
}

interface ApuBreakdown {
  // Costo Directo Unitario
  materialUnit: number;
  laborUnit: number;
  engineeringUnit: number;
  costDirectUnit: number;
  // Cascada de factores
  indirectAmount: number;
  puSinIva: number;
  ivaAmount: number;
  puConIva: number;
  // Totales
  totalSinIva: number;
  totalConIva: number;
}

/**
 * Calcula el desglose de APU de una partida.
 *
 * `unitCost` en LineItem representa el costo unitario base cargado en BD
 * (que puede ser material, MO o mixto). Para modelar el APU asumimos que
 * ese costo base es el Costo Directo Unitario (CD_unit). Aplicamos los
 * factor indirecto a nivel de PU según TASK §5. El factor de Utilidad fue
 * eliminado: el presupuesto estimado se presenta a comité de inversiones y
 * no incluye margen de utilidad (no es cotización integrador → proveedor).
 */
function computeApu(item: LineItem, factors: EstimateFactors): ApuBreakdown {
  const costDirectUnit = Number(item.unitCost) || 0;
  const qty = Number(item.quantity) || 0;
  const { indirectFactor, ivaRate } = factors;

  // Heurística simple: clasificamos el CD_unit en función de la categoría
  // para mostrar desglose informativo en el modal.
  const isLabor = item.category === 'Mano de Obra';
  const isEngineering = item.category === 'Ingeniería';
  const laborUnit = isLabor ? costDirectUnit : 0;
  const engineeringUnit = isEngineering ? costDirectUnit : 0;
  const materialUnit = !isLabor && !isEngineering ? costDirectUnit : 0;

  const indirectAmount = costDirectUnit * indirectFactor;
  const puSinIva = costDirectUnit + indirectAmount;
  const ivaAmount = puSinIva * ivaRate;
  const puConIva = puSinIva + ivaAmount;

  return {
    materialUnit: round2(materialUnit),
    laborUnit: round2(laborUnit),
    engineeringUnit: round2(engineeringUnit),
    costDirectUnit: round2(costDirectUnit),
    indirectAmount: round2(indirectAmount),
    puSinIva: round2(puSinIva),
    ivaAmount: round2(ivaAmount),
    puConIva: round2(puConIva),
    totalSinIva: round2(puSinIva * qty),
    totalConIva: round2(puConIva * qty),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const CATEGORY_VARIANT: Record<string, string> = {
  Equipo: 'bg-emerald-100 text-emerald-800',
  Accesorio: 'bg-sky-100 text-sky-800',
  Consumible: 'bg-amber-100 text-amber-800',
  'Mano de Obra': 'bg-violet-100 text-violet-800',
  Servicio: 'bg-slate-100 text-slate-800',
  Ingeniería: 'bg-orange-100 text-orange-800',
};

export default function ApuDialog({ item, factors, currency, systemLabel }: ApuDialogProps) {
  const apu = computeApu(item, factors);
  const indirectPct = (factors.indirectFactor * 100).toFixed(1);
  const ivaPct = (factors.ivaRate * 100).toFixed(1);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
          aria-label={`Ver APU de ${item.code}`}
          title="Ver Análisis de Precio Unitario"
        >
          <Calculator className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-800">
            <Calculator className="h-5 w-5" />
            Análisis de Precio Unitario (APU)
          </DialogTitle>
          <DialogDescription>
            Desglose paramétrico del costo unitario de la partida.
          </DialogDescription>
        </DialogHeader>

        {/* Encabezado de la partida */}
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-stone-700">
              {item.partida}
            </span>
            <span className="font-mono text-xs text-stone-500">{item.code}</span>
            <Badge
              variant="secondary"
              className={CATEGORY_VARIANT[item.category] ?? 'bg-stone-100 text-stone-800'}
            >
              {item.category}
            </Badge>
            {systemLabel && (
              <Badge variant="outline" className="text-[10px]">
                {systemLabel}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-stone-700">{item.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cantidad: <span className="font-mono font-semibold">{item.quantity}</span>{' '}
            {item.unit} · P.U. base:{' '}
            <span className="font-mono font-semibold">
              {formatCurrency(item.unitCost, factors ? 'MXN' : 'MXN')}
            </span>
          </p>
        </div>

        {/* Composición del Costo Directo Unitario */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Composición del Costo Directo Unitario
          </h4>
          <div className="space-y-1.5 rounded-md border border-stone-200 p-3">
            <Row
              label="Materiales"
              value={apu.materialUnit}
              currency={currency}
              show={apu.materialUnit > 0}
            />
            <Row
              label="Mano de Obra"
              value={apu.laborUnit}
              currency={currency}
              show={apu.laborUnit > 0}
            />
            <Row
              label="Ingeniería / Servicios"
              value={apu.engineeringUnit}
              currency={currency}
              show={apu.engineeringUnit > 0}
            />
            <Separator className="my-1" />
            <Row
              label="Costo Directo Unitario (CD_u)"
              value={apu.costDirectUnit}
              currency={currency}
              bold
            />
          </div>
        </div>

        {/* Cascada de factores */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Cascada de factores
          </h4>
          <div className="space-y-1.5 rounded-md border border-stone-200 p-3 font-mono text-sm">
            <Row
              label={`Indirectos (${indirectPct}%)`}
              value={apu.indirectAmount}
              currency={currency}
              indent
            />
            <Separator className="my-1" />
            <Row label="P.U. sin IVA" value={apu.puSinIva} currency={currency} bold />
            <Row label={`IVA (${ivaPct}%)`} value={apu.ivaAmount} currency={currency} indent />
            <Separator className="my-1" />
            <Row label="P.U. con IVA" value={apu.puConIva} currency={currency} bold highlight />
          </div>
        </div>

        {/* Importe total */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Importe total sin IVA
            </p>
            <p className="text-lg font-bold text-stone-800 font-mono">
              {formatCurrency(apu.totalSinIva, currency)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {item.quantity} × {formatCurrency(apu.puSinIva, currency)}
            </p>
          </div>
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-emerald-700">
              Importe total con IVA
            </p>
            <p className="text-lg font-bold text-emerald-700 font-mono">
              {formatCurrency(apu.totalConIva, currency)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {item.quantity} × {formatCurrency(apu.puConIva, currency)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  currency,
  bold,
  indent,
  highlight,
  show = true,
}: {
  label: string;
  value: number;
  currency: 'MXN' | 'USD';
  bold?: boolean;
  indent?: boolean;
  highlight?: boolean;
  show?: boolean;
}) {
  if (!show) return null;
  return (
    <div
      className={`flex items-center justify-between ${
        indent ? 'pl-3 text-muted-foreground' : ''
      } ${bold ? 'font-semibold text-stone-800' : ''} ${
        highlight ? 'text-emerald-700' : ''
      }`}
    >
      <span className={bold ? 'text-sm' : 'text-sm'}>{label}</span>
      <span className={bold ? 'text-sm' : 'text-sm'}>{formatCurrency(value, currency)}</span>
    </div>
  );
}
