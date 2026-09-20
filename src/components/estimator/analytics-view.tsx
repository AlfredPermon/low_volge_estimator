'use client';

/**
 * E3 - Vista de Análisis con gráficos (TASK §17).
 *
 * Genera 3 sub-vistas:
 *  - Distribución por sistema (Pie chart)
 *  - Cascada financiera Directo → Indirecto → Utilidad → IVA (Bar chart)
 *  - Pareto de conceptos con mayor importe acumulado
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, Layers, TrendingUp, ListOrdered } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useEstimateStore } from '@/store/estimate-store';
import { formatCurrency } from '@/lib/utils';
import type { LineItem } from '@/store/estimate-store';

const SYSTEM_COLORS: Record<string, string> = {
  CCTV: '#0ea5e9',         // sky-500
  ACCESO: '#f59e0b',       // amber-500
  VOCEO: '#a855f7',        // purple-500
  INCENDIO: '#ef4444',     // red-500
  CANALIZACION: '#14b8a6', // teal-500
  CABLEADO: '#f97316',     // orange-500
  GENERAL: '#6b7280',      // gray-500
};

const FINANCIAL_COLORS = {
  directo: '#10b981',      // emerald-500
  indirecto: '#0ea5e9',    // sky-500
  utilidad: '#a855f7',     // purple-500
  iva: '#f59e0b',          // amber-500
};

export default function AnalyticsView() {
  const result = useEstimateStore((s) => s.result);
  const currency = useEstimateStore((s) => s.currency);
  const name = useEstimateStore((s) => s.name);

  // ── Distribución por sistema
  const systemData = useMemo(() => {
    if (!result) return [];
    const map = new Map<string, number>();
    for (const item of result.lineItems) {
      map.set(item.system, (map.get(item.system) ?? 0) + (item.total ?? 0));
    }
    return Array.from(map.entries())
      .map(([system, total]) => ({ name: system, value: total }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [result]);

  // ── Cascada financiera
  const financialData = useMemo(() => {
    if (!result) return [];
    return [
      { name: 'Subtotal Directo', value: result.subtotalDirect, fill: FINANCIAL_COLORS.directo },
      { name: 'Indirectos', value: result.subtotalIndirects, fill: FINANCIAL_COLORS.indirecto },
      { name: 'Utilidad', value: result.subtotalUtility, fill: FINANCIAL_COLORS.utilidad },
      { name: 'Gran Total', value: result.grandTotal, fill: '#374151' },
      { name: 'IVA', value: result.iva ?? 0, fill: FINANCIAL_COLORS.iva },
      { name: 'Total con IVA', value: result.totalWithIva ?? result.grandTotal, fill: '#059669' },
    ];
  }, [result]);

  // ── Pareto
  const paretoData = useMemo(() => {
    if (!result) return [];
    const sorted = [...result.lineItems]
      .filter((it) => (it.total ?? 0) > 0)
      .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
      .slice(0, 10);
    let acc = 0;
    const total = result.grandTotal || 1;
    return sorted.map((it) => {
      acc += it.total ?? 0;
      return {
        name: it.code || it.partida,
        partida: it.partida,
        description: it.description,
        system: it.system,
        total: it.total ?? 0,
        acumulado: acc,
        porcentaje: ((acc / total) * 100).toFixed(1),
      };
    });
  }, [result]);

  if (!result) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-stone-300" />
          <p className="font-medium">No hay cálculo disponible</p>
          <p className="text-sm mt-1">
            Calcula un presupuesto desde el wizard para ver los análisis gráficos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          Análisis — {name}
        </h2>
        <p className="text-sm text-muted-foreground">
          Visualización gráfica de la composición financiera y principales conceptos.
        </p>
      </div>

      <Tabs defaultValue="systems" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="systems" className="gap-1.5">
            <Layers className="w-4 h-4" />
            Sistemas
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Financiero
          </TabsTrigger>
          <TabsTrigger value="pareto" className="gap-1.5">
            <ListOrdered className="w-4 h-4" />
            Pareto
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Distribución por Sistema (Pie) */}
        <TabsContent value="systems">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribución por Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={systemData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={50}
                      paddingAngle={2}
                      label={(d) => `${d.name}`}
                    >
                      {systemData.map((d) => (
                        <Cell
                          key={d.name}
                          fill={SYSTEM_COLORS[d.name] ?? '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v, currency)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalle por Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {systemData.map((d) => {
                    const total = systemData.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? (d.value / total) * 100 : 0;
                    return (
                      <div key={d.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: SYSTEM_COLORS[d.name] ?? '#94a3b8' }}
                            />
                            <span className="font-medium">{d.name}</span>
                          </div>
                          <span className="font-mono text-xs">
                            {formatCurrency(d.value, currency)} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              backgroundColor: SYSTEM_COLORS[d.name] ?? '#94a3b8',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 2: Cascada Financiera (Bar) */}
        <TabsContent value="financial">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cascada Financiera del Presupuesto</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={financialData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                      }
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v, currency)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {financialData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Composición Porcentual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {financialData.map((d) => {
                    const total = (result.totalWithIva ?? result.grandTotal) || 1;
                    const pct = (d.value / total) * 100;
                    return (
                      <div
                        key={d.name}
                        className="rounded-lg border border-stone-200 p-3"
                      >
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {d.name}
                        </p>
                        <p className="text-sm font-bold font-mono mt-0.5" style={{ color: d.fill }}>
                          {formatCurrency(d.value, currency)}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] mt-1"
                          style={{ borderColor: d.fill, color: d.fill }}
                        >
                          {pct.toFixed(1)}%
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 3: Pareto (Line + Bars) */}
        <TabsContent value="pareto">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Top 10 Conceptos — Curva de Pareto (80/20)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={paretoData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      stroke="#64748b"
                      angle={-30}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                      }
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      stroke="#a855f7"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const data = payload[0].payload as {
                          partida: string;
                          description: string;
                          system: string;
                          total: number;
                          porcentaje: string;
                        };
                        return (
                          <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-md text-xs">
                            <p className="font-mono font-semibold">
                              {data.partida} · {data.system}
                            </p>
                            <p className="text-muted-foreground max-w-xs truncate">
                              {data.description}
                            </p>
                            <p className="mt-1 font-mono font-semibold">
                              {formatCurrency(data.total, currency)}
                            </p>
                            <p className="text-violet-600 font-semibold">
                              Acumulado: {data.porcentaje}%
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="total"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={(d: { acumulado: number }) =>
                        (d.acumulado / (result.grandTotal || 1)) * 100
                      }
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ fill: '#a855f7', r: 4 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tabla Pareto Detallada</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-600">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Partida</th>
                        <th className="px-3 py-2 text-left">Sistema</th>
                        <th className="px-3 py-2 text-right">Importe</th>
                        <th className="px-3 py-2 text-right">% Acum.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paretoData.map((d, idx) => (
                        <tr key={d.name} className="border-t border-stone-200">
                          <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {d.partida} <span className="text-muted-foreground">· {d.description}</span>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className="text-[10px]">
                              {d.system}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            {formatCurrency(d.total, currency)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Badge
                              variant="secondary"
                              className="font-mono"
                              style={{
                                backgroundColor:
                                  parseFloat(d.porcentaje) > 80
                                    ? '#fef3c7'
                                    : parseFloat(d.porcentaje) > 50
                                      ? '#dbeafe'
                                      : '#f1f5f9',
                              }}
                            >
                              {d.porcentaje}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
