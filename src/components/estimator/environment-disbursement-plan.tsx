'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { EnvironmentDisbursementPlan } from '@/lib/environment-erogations';

interface EnvironmentDisbursementPlanProps {
  plan: EnvironmentDisbursementPlan;
  formatCurrency: (value: number) => string;
}

const CATEGORY_STYLES = {
  inmobiliario: {
    label: 'Inmobiliario',
    bar: 'bg-violet-500',
    chip: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  equipo: {
    label: 'Equipo',
    bar: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  rrhh: {
    label: 'RRHH',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
} as const;

export default function EnvironmentDisbursementPlanView({
  plan,
  formatCurrency,
}: EnvironmentDisbursementPlanProps) {
  if (plan.totals.grandTotal <= 0) {
    return (
      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-stone-100 bg-stone-50/50 rounded-t-xl">
          <CardTitle className="text-sm font-semibold text-stone-700">Plan de erogaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-stone-500">
            Selecciona partidas para generar el flujo de caja mensual del módulo de Medio Ambiente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-stone-100 bg-stone-50/50 rounded-t-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-stone-700">Plan de erogaciones</CardTitle>
              <p className="text-xs text-stone-500 mt-1">
                Flujo mensual para Inmobiliario, Equipo y RRHH con anticipo inicial y acumulado total.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Pico: {plan.summary.peakMonthLabel} · {formatCurrency(plan.summary.peakMonthTotal)}
              </Badge>
              <Badge variant="outline" className="bg-stone-50 text-stone-700 border-stone-200">
                Mes 1: {plan.summary.firstMonthWeightPct.toFixed(1)}% del total
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Total del plan</p>
              <p className="mt-2 text-2xl font-bold text-emerald-800">{formatCurrency(plan.totals.grandTotal)}</p>
              <p className="mt-1 text-xs text-emerald-700/80">
                Promedio mensual: {formatCurrency(plan.summary.averageMonthlyTotal)}
              </p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Inmobiliario + Equipo</p>
              <p className="mt-2 text-2xl font-bold text-violet-800">
                {formatCurrency(plan.totals.inmobiliario + plan.totals.equipo)}
              </p>
              <p className="mt-1 text-xs text-violet-700/80">
                Anticipo inicial del 60% y dispersión del 40% restante
              </p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Cobertura RRHH</p>
              <p className="mt-2 text-2xl font-bold text-sky-800">{formatCurrency(plan.totals.rrhh)}</p>
              <p className="mt-1 text-xs text-sky-700/80">
                Distribución lineal durante {plan.humanResMonths} meses paramétricos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {plan.rows.map((row) => {
          const total = row.totalMonthly || 1;

          return (
            <Card key={row.monthIndex} className="border-stone-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{row.monthLabel}</p>
                    <p className="text-xs text-stone-500">{row.periodLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-stone-900">{formatCurrency(row.totalMonthly)}</p>
                    <p className="text-xs text-stone-500">Acumulado: {formatCurrency(row.cumulativeTotal)}</p>
                  </div>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-stone-100">
                  <div className="flex h-full w-full">
                    <div
                      className={CATEGORY_STYLES.inmobiliario.bar}
                      style={{ width: `${(row.inmobiliario / total) * 100}%` }}
                    />
                    <div
                      className={CATEGORY_STYLES.equipo.bar}
                      style={{ width: `${(row.equipo / total) * 100}%` }}
                    />
                    <div
                      className={CATEGORY_STYLES.rrhh.bar}
                      style={{ width: `${(row.rrhh / total) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  {([
                    ['inmobiliario', row.inmobiliario],
                    ['equipo', row.equipo],
                    ['rrhh', row.rrhh],
                  ] as const).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-medium ${CATEGORY_STYLES[key].chip}`}>
                        {CATEGORY_STYLES[key].label}
                      </span>
                      <span className="font-semibold text-stone-700">{formatCurrency(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-stone-100 bg-stone-50/50 rounded-t-xl">
          <CardTitle className="text-sm font-semibold text-stone-700">Desglose mensual</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader className="bg-stone-50/80">
                <TableRow>
                  <TableHead className="min-w-[130px]">Mes</TableHead>
                  <TableHead className="min-w-[140px]">Periodo</TableHead>
                  <TableHead className="text-right">Inmobiliario</TableHead>
                  <TableHead className="text-right">Equipo</TableHead>
                  <TableHead className="text-right">RRHH</TableHead>
                  <TableHead className="text-right">Total mensual</TableHead>
                  <TableHead className="text-right">Total acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.rows.map((row) => (
                  <TableRow key={row.monthIndex} className="hover:bg-stone-50/50">
                    <TableCell className="font-medium text-stone-800">{row.monthLabel}</TableCell>
                    <TableCell className="text-stone-500">{row.periodLabel}</TableCell>
                    <TableCell className="text-right text-stone-700">{formatCurrency(row.inmobiliario)}</TableCell>
                    <TableCell className="text-right text-stone-700">{formatCurrency(row.equipo)}</TableCell>
                    <TableCell className="text-right text-stone-700">{formatCurrency(row.rrhh)}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(row.totalMonthly)}</TableCell>
                    <TableCell className="text-right font-semibold text-stone-900">{formatCurrency(row.cumulativeTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
