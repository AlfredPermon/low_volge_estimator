'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Package,
  HardHat,
  Box,
  ListChecks,
  BarChart3,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useEstimateStore, type LineItem } from '@/store/estimate-store';
import { formatCurrency } from '@/lib/utils';

type CategorySummary = {
  category: string;
  count: number;
  total: number;
  items: LineItem[];
};

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: typeof Package }> = {
  Equipo: { label: 'Equipos', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Box },
  Accesorio: { label: 'Accesorios', color: 'bg-sky-100 text-sky-800 border-sky-200', icon: Package },
  Consumible: { label: 'Consumibles', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Package },
  'Mano de Obra': { label: 'Mano de Obra', color: 'bg-violet-100 text-violet-800 border-violet-200', icon: HardHat },
  Servicio: { label: 'Servicios', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: ListChecks },
  Ingeniería: { label: 'Ingeniería', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: ListChecks },
};

const CATEGORY_ORDER = ['Equipo', 'Accesorio', 'Consumible', 'Mano de Obra', 'Servicio', 'Ingeniería'];

/**
 * Vista de Reportes (TASK §17.4, §17.5).
 *
 * Genera 3 sub-reportes derivados del cálculo:
 *  - Resumen de Materiales: agrupado por categoría
 *  - Resumen de MO: desglose por sistema con horas estimadas
 *  - Pareto: conceptos más caros del presupuesto
 */
export default function ReportsView() {
  const result = useEstimateStore((s) => s.result);
  const currency = useEstimateStore((s) => s.currency);
  const name = useEstimateStore((s) => s.name);
  const factors = useEstimateStore((s) => s.factors);

  // ── Resumen por categoría
  const categorySummary: CategorySummary[] = useMemo(() => {
    if (!result) return [];
    const map = new Map<string, CategorySummary>();
    for (const item of result.lineItems) {
      const cat = item.category || 'Equipo';
      const existing = map.get(cat) ?? {
        category: cat,
        count: 0,
        total: 0,
        items: [],
      };
      existing.count += 1;
      existing.total += item.total ?? 0;
      existing.items.push(item);
      map.set(cat, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [result]);

  // ── Resumen por sistema
  const systemSummary = useMemo(() => {
    if (!result) return [];
    const map = new Map<string, { system: string; count: number; total: number; labor: number }>();
    for (const item of result.lineItems) {
      const sys = item.system;
      const existing = map.get(sys) ?? { system: sys, count: 0, total: 0, labor: 0 };
      existing.count += 1;
      existing.total += item.total ?? 0;
      if (item.category === 'Mano de Obra') existing.labor += item.total ?? 0;
      map.set(sys, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [result]);

  // ── Pareto: top conceptos más caros
  const pareto = useMemo(() => {
    if (!result) return [];
    return [...result.lineItems]
      .filter((it) => (it.total ?? 0) > 0)
      .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
      .slice(0, 15);
  }, [result]);

  if (!result) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <PieChart className="w-12 h-12 mx-auto mb-3 text-stone-300" />
          <p className="font-medium">No hay cálculo disponible</p>
          <p className="text-sm mt-1">
            Calcula un presupuesto desde el wizard para ver los reportes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalByCategory = categorySummary.reduce((s, c) => s + c.total, 0);
  const totalBySystem = systemSummary.reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          Reportes — {name}
        </h2>
        <p className="text-sm text-muted-foreground">
          Análisis detallado de materiales, mano de obra y conceptos principales.
        </p>
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="materials">Materiales</TabsTrigger>
          <TabsTrigger value="labor">Mano de Obra</TabsTrigger>
          <TabsTrigger value="pareto">Pareto</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Resumen de Materiales */}
        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Box className="w-4 h-4" />
                Resumen por Categoría
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {CATEGORY_ORDER.map((cat) => {
                  const summary = categorySummary.find((c) => c.category === cat);
                  if (!summary || summary.total === 0) return null;
                  const cfg = CATEGORY_LABELS[cat];
                  const pct = totalByCategory > 0 ? (summary.total / totalByCategory) * 100 : 0;
                  const Icon = cfg?.icon ?? Package;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="font-medium">{cfg?.label ?? cat}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {summary.count} items
                          </Badge>
                        </span>
                        <span className="font-mono">
                          {formatCurrency(summary.total, currency)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator className="my-4" />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Categoría</TableHead>
                    <TableHead className="text-xs text-center">Items</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorySummary
                    .filter((c) => c.total > 0)
                    .map((c) => {
                      const cfg = CATEGORY_LABELS[c.category];
                      const pct = totalByCategory > 0 ? (c.total / totalByCategory) * 100 : 0;
                      return (
                        <TableRow key={c.category}>
                          <TableCell>
                            <Badge variant="outline" className={cfg?.color}>
                              {cfg?.label ?? c.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {c.count}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(c.total, currency)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {pct.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Resumen por sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                Distribución por Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Sistema</TableHead>
                    <TableHead className="text-xs text-center">Items</TableHead>
                    <TableHead className="text-xs text-right">Materiales</TableHead>
                    <TableHead className="text-xs text-right">M.O.</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemSummary.map((s) => {
                    const materials = s.total - s.labor;
                    const pct = totalBySystem > 0 ? (s.total / totalBySystem) * 100 : 0;
                    return (
                      <TableRow key={s.system}>
                        <TableCell>
                          <span className="font-medium">{s.system}</span>
                        </TableCell>
                        <TableCell className="text-center text-xs">{s.count}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(materials, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(s.labor, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(s.total, currency)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {pct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Mano de Obra */}
        <TabsContent value="labor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HardHat className="w-4 h-4" />
                Mano de Obra — Configuración
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <RateCard
                  label="Técnico"
                  rate={factors.laborRates.technician}
                  currency={currency}
                />
                <RateCard
                  label="Oficial"
                  rate={factors.laborRates.officer}
                  currency={currency}
                />
                <RateCard
                  label="Ayudante"
                  rate={factors.laborRates.helper}
                  currency={currency}
                />
                <RateCard
                  label="Promedio"
                  rate={
                    (factors.laborRates.technician +
                      factors.laborRates.officer +
                      factors.laborRates.helper) /
                    3
                  }
                  currency={currency}
                  highlight
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Modelo:{' '}
                <span className="font-medium">
                  {factors.useCrewBasedLabor
                    ? 'Por Cuadrilla (TASK §6)'
                    : 'Costo unitario plano (legacy)'}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mano de Obra por Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Sistema</TableHead>
                    <TableHead className="text-xs">Línea MO</TableHead>
                    <TableHead className="text-xs text-right">Costo</TableHead>
                    <TableHead className="text-xs text-right">% del sistema</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.lineItems
                    .filter((it) => it.category === 'Mano de Obra')
                    .map((it) => {
                      const systemTotal =
                        systemSummary.find((s) => s.system === it.system)?.total ?? 1;
                      const pct = (it.total ?? 0) / systemTotal * 100;
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="text-xs font-medium">
                            {it.system}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {it.description}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(it.total ?? 0, currency)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {pct.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell colSpan={2}>Total Mano de Obra</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(result.subtotalLabor, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(
                        (result.subtotalLabor / result.subtotalDirect) *
                        100
                      ).toFixed(1)}
                      %
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Pareto */}
        <TabsContent value="pareto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Top 15 Conceptos con Mayor Importe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] text-xs">#</TableHead>
                    <TableHead className="text-xs">Partida</TableHead>
                    <TableHead className="text-xs">Descripción</TableHead>
                    <TableHead className="text-xs">Sistema</TableHead>
                    <TableHead className="text-xs text-right">Importe</TableHead>
                    <TableHead className="text-xs text-right">% Acum.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    let acc = 0;
                    return pareto.map((it, idx) => {
                      acc += it.total ?? 0;
                      const pctAcc = (acc / result.grandTotal) * 100;
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {it.partida}
                          </TableCell>
                          <TableCell className="text-xs">
                            {it.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {it.system}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(it.total ?? 0, currency)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {pctAcc.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RateCard({
  label,
  rate,
  currency,
  highlight,
}: {
  label: string;
  rate: number;
  currency: 'MXN' | 'USD';
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'rounded-lg border p-3 ' +
        (highlight
          ? 'border-amber-300 bg-amber-50'
          : 'border-stone-200 bg-stone-50')
      }
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-bold font-mono">
        {formatCurrency(rate, currency)}
        <span className="text-xs text-muted-foreground font-normal">/h</span>
      </p>
    </div>
  );
}
