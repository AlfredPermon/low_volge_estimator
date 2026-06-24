'use client';

import { useMemo } from 'react';
import {
  FileText,
  Download,
  DollarSign,
  Users,
  Wrench,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { useEstimateStore, type LineItem } from '@/store/estimate-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

// ─── System color mapping ──────────────────────────────────────────────

const SYSTEM_STYLES: Record<
  string,
  { bg: string; text: string; border: string; badge: string }
> = {
  CCTV: {
    bg: 'bg-slate-50',
    text: 'text-slate-800',
    border: 'border-slate-300',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  ACCESO: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  VOCEO: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-300',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  INCENDIO: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-800 border-red-300',
  },
  CANALIZACION: {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-300',
    badge: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  CABLEADO: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-300',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  GENERAL: {
    bg: 'bg-gray-50',
    text: 'text-gray-800',
    border: 'border-gray-300',
    badge: 'bg-gray-100 text-gray-800 border-gray-300',
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(value: number, currency: 'MXN' | 'USD'): string {
  const safe = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

function formatQty(value: number): string {
  return value.toFixed(2);
}

function getSystemStyle(system: string) {
  return SYSTEM_STYLES[system] ?? SYSTEM_STYLES.GENERAL;
}

function getSystemDisplayName(system: string): string {
  const names: Record<string, string> = {
    CCTV: 'CCTV — Videovigilancia',
    ACCESO: 'Control de Acceso',
    VOCEO: 'Sistema de Voceo / PA',
    INCENDIO: 'Detección y Alarma contra Incendio',
    CANALIZACION: 'Canalización',
    CABLEADO: 'Cableado Estructurado',
    GENERAL: 'Generales y Servicios',
  };
  return names[system] ?? system;
}

// ─── CSV Export ────────────────────────────────────────────────────────

function exportToCSV(
  lineItems: LineItem[],
  currency: 'MXN' | 'USD',
  result: NonNullable<ReturnType<typeof useEstimateStore.getState>['result']>,
  name: string,
  clientName: string,
  projectName: string,
) {
  const currencyLabel = currency === 'MXN' ? 'MXN' : 'USD';
  const rows: string[][] = [];

  // Header metadata
  rows.push(['Presupuesto de Baja Tensión']);
  rows.push([`Nombre: ${name}`]);
  rows.push([`Cliente: ${clientName || '—'}`]);
  rows.push([`Proyecto: ${projectName || '—'}`]);
  rows.push([`Moneda: ${currencyLabel}`]);
  rows.push([]);

  // Column headers
  rows.push([
    'Partida',
    'Código',
    'Descripción',
    'Sistema',
    'Categoría',
    'Unidad',
    'Cantidad',
    'P.U.',
    'Importe',
  ]);

  // Group items by system, ordered
  const systemOrder = [
    'CCTV',
    'ACCESO',
    'VOCEO',
    'INCENDIO',
    'CANALIZACION',
    'CABLEADO',
    'GENERAL',
  ];
  const grouped = new Map<string, LineItem[]>();
  for (const item of lineItems) {
    const list = grouped.get(item.system) ?? [];
    list.push(item);
    grouped.set(item.system, list);
  }

  for (const system of systemOrder) {
    const items = grouped.get(system);
    if (!items || items.length === 0) continue;

    rows.push([getSystemDisplayName(system)]);

    for (const item of items) {
      rows.push([
        item.partida,
        item.code,
        item.description,
        item.system,
        item.category,
        item.unit,
        formatQty(item.quantity),
        item.unitCost.toFixed(2),
        item.total.toFixed(2),
      ]);
    }

    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    rows.push(['', '', `Subtotal ${system}`, '', '', '', '', '', subtotal.toFixed(2)]);
    rows.push([]);
  }

  // Totals
  rows.push([]);
  rows.push(['RESUMEN DE TOTALES']);
  rows.push(['Subtotal Directo (Materiales + Mano de Obra)', '', '', '', '', '', '', '', result.subtotalDirect.toFixed(2)]);
  rows.push(['Costos Indirectos', '', '', '', '', '', '', '', result.subtotalIndirects.toFixed(2)]);
  rows.push(['Utilidad', '', '', '', '', '', '', '', result.subtotalUtility.toFixed(2)]);
  rows.push(['GRAN TOTAL', '', '', '', '', '', '', '', result.grandTotal.toFixed(2)]);

  // Build CSV string
  const csvContent = rows
    .map((row) =>
      row.map((cell) => {
        const escaped = String(cell).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','),
    )
    .join('\r\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ _-]/g, '_')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Component ─────────────────────────────────────────────────────────

export default function BudgetView() {
  const result = useEstimateStore((s) => s.result);
  const currency = useEstimateStore((s) => s.currency);
  const name = useEstimateStore((s) => s.name);
  const clientName = useEstimateStore((s) => s.clientName);
  const projectName = useEstimateStore((s) => s.projectName);

  // Group line items by system, preserving order
  const groupedItems = useMemo(() => {
    if (!result) return [];
    const systemOrder = [
      'CCTV',
      'ACCESO',
      'VOCEO',
      'INCENDIO',
      'CANALIZACION',
      'CABLEADO',
      'GENERAL',
    ];
    const map = new Map<string, LineItem[]>();
    for (const item of result.lineItems) {
      const list = map.get(item.system) ?? [];
      list.push(item);
      map.set(item.system, list);
    }
    const ordered: { system: string; items: LineItem[]; subtotal: number }[] = [];
    for (const sys of systemOrder) {
      const items = map.get(sys);
      if (items && items.length > 0) {
        ordered.push({
          system: sys,
          items,
          subtotal: items.reduce((sum, it) => sum + it.total, 0),
        });
      }
    }
    // Add any systems not in the predefined order
    for (const [sys, items] of map) {
      if (!systemOrder.includes(sys)) {
        ordered.push({
          system: sys,
          items,
          subtotal: items.reduce((sum, it) => sum + it.total, 0),
        });
      }
    }
    return ordered;
  }, [result]);

  // ── Placeholder ──────────────────────────────────────────────────────
  if (!result) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="rounded-full bg-teal-50 p-5">
            <Building2 className="h-10 w-10 text-teal-500" />
          </div>
          <p className="text-center text-muted-foreground max-w-md leading-relaxed">
            Configure los sistemas y presione &lsquo;Calcular Presupuesto&rsquo;
            para ver el desglose.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-teal-50 p-2.5">
            <FileText className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{name}</h2>
            <p className="text-sm text-muted-foreground">
              {clientName && `Cliente: ${clientName}`}
              {clientName && projectName && ' · '}
              {projectName && `Proyecto: ${projectName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold px-3 py-1">
            {currency}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
            onClick={() =>
              exportToCSV(
                result.lineItems,
                currency,
                result,
                name,
                clientName,
                projectName,
              )
            }
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Materiales */}
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2.5">
              <DollarSign className="h-5 w-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                Total Materiales
              </p>
              <p className="text-lg font-bold text-slate-800 truncate">
                {formatCurrency(result.subtotalMaterials, currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mano de Obra */}
        <Card className="border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2.5">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                Mano de Obra
              </p>
              <p className="text-lg font-bold text-amber-800 truncate">
                {formatCurrency(result.subtotalLabor, currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Costos Indirectos */}
        <Card className="border-teal-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-teal-50 p-2.5">
              <Wrench className="h-5 w-5 text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                Costos Indirectos
              </p>
              <p className="text-lg font-bold text-teal-700 truncate">
                {formatCurrency(result.subtotalIndirects, currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* TOTAL ESTIMADO */}
        <Card className="border-emerald-300 bg-emerald-50/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-emerald-700 font-semibold truncate">
                TOTAL ESTIMADO
              </p>
              <p className="text-xl font-bold text-emerald-600 truncate">
                {formatCurrency(result.grandTotal, currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Line Items Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[80px] text-xs font-semibold">
                    Partida
                  </TableHead>
                  <TableHead className="w-[90px] text-xs font-semibold">
                    Código
                  </TableHead>
                  <TableHead className="min-w-[200px] text-xs font-semibold">
                    Descripción
                  </TableHead>
                  <TableHead className="w-[70px] text-xs font-semibold text-center">
                    Unidad
                  </TableHead>
                  <TableHead className="w-[80px] text-xs font-semibold text-right">
                    Cantidad
                  </TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold text-right">
                    P.U.
                  </TableHead>
                  <TableHead className="w-[120px] text-xs font-semibold text-right">
                    Importe
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedItems.map((group) => {
                  const style = getSystemStyle(group.system);
                  return (
                    <GroupedRows
                      key={group.system}
                      group={group}
                      style={style}
                      currency={currency}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Totals Section */}
      <Card className="border-emerald-200">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            Resumen de Totales
          </h3>
          <div className="space-y-2 max-w-sm ml-auto">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal Directo</span>
              <span className="font-medium">
                {formatCurrency(result.subtotalDirect, currency)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground -mt-1 ml-auto max-w-sm text-right">
              (Materiales + Mano de Obra)
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Costos Indirectos</span>
              <span className="font-medium">
                {formatCurrency(result.subtotalIndirects, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Utilidad</span>
              <span className="font-medium">
                {formatCurrency(result.subtotalUtility, currency)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <span className="text-lg font-bold text-emerald-600">
                GRAN TOTAL
              </span>
              <span className="text-xl font-bold text-emerald-600">
                {formatCurrency(result.grandTotal, currency)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Grouped Table Rows (sub-component) ────────────────────────────────

function GroupedRows({
  group,
  style,
  currency,
}: {
  group: { system: string; items: LineItem[]; subtotal: number };
  style: { bg: string; text: string; border: string; badge: string };
  currency: 'MXN' | 'USD';
}) {
  return (
    <>
      {/* System group header */}
      <TableRow className={`${style.bg} hover:${style.bg}`}>
        <TableCell
          colSpan={7}
          className={`py-2.5 px-4 font-semibold text-sm ${style.text}`}
        >
          <div className="flex items-center justify-between">
            <span>{getSystemDisplayName(group.system)}</span>
            <Badge
              variant="outline"
              className={`${style.badge} text-xs font-semibold`}
            >
              {formatCurrency(group.subtotal, currency)}
            </Badge>
          </div>
        </TableCell>
      </TableRow>

      {/* Line items for this system */}
      {group.items.map((item, idx) => (
        <TableRow key={`${item.partida}-${item.code}-${idx}`}>
          <TableCell className="text-xs text-muted-foreground font-mono">
            {item.partida}
          </TableCell>
          <TableCell className="text-xs font-mono">{item.code}</TableCell>
          <TableCell className="text-sm">{item.description}</TableCell>
          <TableCell className="text-xs text-center text-muted-foreground">
            {item.unit}
          </TableCell>
          <TableCell className="text-xs text-right tabular-nums">
            {formatQty(item.quantity)}
          </TableCell>
          <TableCell className="text-xs text-right tabular-nums">
            {formatCurrency(item.unitCost, currency)}
          </TableCell>
          <TableCell className="text-sm text-right font-medium tabular-nums">
            {formatCurrency(item.total, currency)}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}