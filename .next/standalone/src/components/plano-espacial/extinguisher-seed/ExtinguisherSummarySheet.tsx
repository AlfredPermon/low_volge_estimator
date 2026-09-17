'use client';

import React from 'react';
import { ExtinguisherDevice, ExtinguisherType } from '@/types/fireProtection';
import { EXTINGUISHER_CATALOG } from '@/lib/fireNormativeValidator';
import { useEstimateStore } from '@/store/estimate-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Flame, ShieldCheck, ShieldAlert, FileText, CheckCircle2, AlertTriangle, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ExtinguisherClassIcon } from './ExtinguisherClassIcon';

interface ExtinguisherSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extinguishers: ExtinguisherDevice[];
}

export function ExtinguisherSummarySheet({
  open,
  onOpenChange,
  extinguishers,
}: ExtinguisherSummarySheetProps) {
  const estimateStore = useEstimateStore();

  // Agrupar por tipo y capacidad
  const breakdownMap = new Map<string, { type: ExtinguisherType; capacity: string; count: number }>();

  extinguishers.forEach((dev) => {
    const key = `${dev.type}_${dev.capacity}`;
    const existing = breakdownMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      breakdownMap.set(key, { type: dev.type, capacity: dev.capacity, count: 1 });
    }
  });

  const breakdown = Array.from(breakdownMap.values());

  // Conteo de cumplimientos normativos
  const totalCount = extinguishers.length;
  const validCount = extinguishers.filter((d) => d.isValidLocation).length;
  const invalidCount = totalCount - validCount;

  // Cálculo de total estimado en catálogo
  let grandTotalCost = 0;
  const itemsWithPrice = breakdown.map((item) => {
    const match = EXTINGUISHER_CATALOG.find(
      (cat) => cat.type === item.type && cat.capacity === item.capacity
    ) || EXTINGUISHER_CATALOG.find((cat) => cat.type === item.type);

    const unitCost = match ? match.unitCost : 2500.0;
    const totalAmount = unitCost * item.count;
    grandTotalCost += totalAmount;

    return {
      ...item,
      sku: match ? match.sku : `EXT-${item.type}-${item.capacity}`,
      name: match ? match.name : `Extintor ${item.type} ${item.capacity}`,
      unitCost,
      totalAmount,
    };
  });

  // Agregar partidas de extintores al Presupuesto de la app
  const handleAddToBudget = () => {
    if (itemsWithPrice.length === 0) {
      toast.warning('No hay extintores sembrados para agregar al presupuesto.');
      return;
    }

    let addedCount = 0;
    itemsWithPrice.forEach((item) => {
      estimateStore.addLineItem({
        system: 'INCENDIO',
        category: 'Equipo',
        code: item.sku,
        description: `${item.name} (Sembrado 2D NOM-002/016/026)`,
        unit: 'PZA',
        quantity: item.count,
        unitCost: item.unitCost,
      });
      addedCount += item.count;
    });

    toast.success(`Se agregaron ${addedCount} extintores al catálogo de presupuesto ejecutivos.`, {
      icon: '🧯',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-stone-900 border-stone-800 text-stone-100 p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-950 border border-orange-600/50 rounded-xl text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Resumen & Cuantificación Extintores
                <Badge variant="outline" className="border-orange-500/50 bg-orange-950 text-orange-300 font-mono text-xs">
                  NOM-002 / NOM-016 / NOM-026
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400">
                Desglose paramétrico de seguridad contra incendio hospitalaria y validación normativa en tiempo real.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ─── Scorecard de Cumplimiento Normativo ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
          <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Total Extintores</span>
            <div className="text-2xl font-extrabold text-white font-mono">{totalCount}</div>
            <span className="text-[11px] text-stone-400">Equipos colocados en canvas</span>
          </div>

          <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-600/40 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Cumplen NOMs
            </span>
            <div className="text-2xl font-extrabold text-emerald-300 font-mono">{validCount}</div>
            <span className="text-[11px] text-emerald-400/80">Ubicaciones 100% válidas</span>
          </div>

          <div className={`p-3 rounded-xl border space-y-1 ${
            invalidCount > 0 ? 'bg-red-950/60 border-red-600/50' : 'bg-stone-800/80 border-stone-700'
          }`}>
            <span className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
              invalidCount > 0 ? 'text-red-400' : 'text-stone-400'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5" /> Con Advertencia
            </span>
            <div className={`text-2xl font-extrabold font-mono ${invalidCount > 0 ? 'text-red-300' : 'text-stone-400'}`}>
              {invalidCount}
            </div>
            <span className="text-[11px] text-stone-400">Incompatibilidad o distancia</span>
          </div>
        </div>

        {/* ─── Tabla de Desglose de Insumos y Precios ─── */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-orange-400" /> Catálogo Comercial de Extintores
          </h4>

          <div className="border border-stone-800 rounded-xl overflow-hidden bg-stone-950">
            <Table className="text-xs">
              <TableHeader className="bg-stone-900">
                <TableRow className="border-stone-800 hover:bg-transparent">
                  <TableHead className="text-stone-300">SKU / Código</TableHead>
                  <TableHead className="text-stone-300">Descripción / Agente</TableHead>
                  <TableHead className="text-center text-stone-300">Cant.</TableHead>
                  <TableHead className="text-right text-stone-300">P. Unitario (MXN)</TableHead>
                  <TableHead className="text-right text-stone-300">Importe (MXN)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsWithPrice.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-stone-500 italic">
                      No hay extintores sembrados en el plano actual. Use el lienzo 2D para colocar extintores.
                    </TableCell>
                  </TableRow>
                ) : (
                  itemsWithPrice.map((item, idx) => (
                    <TableRow key={idx} className="border-stone-800/60 hover:bg-stone-900/60">
                      <TableCell className="font-mono text-orange-300 font-semibold">{item.sku}</TableCell>
                      <TableCell className="text-stone-200">
                        <div className="flex items-center gap-2.5">
                          <ExtinguisherClassIcon agentType={item.type} size={32} />
                          <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-[10px] text-stone-400">Agente: {item.type} ({item.capacity})</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold font-mono text-white">{item.count}</TableCell>
                      <TableCell className="text-right font-mono text-stone-300">
                        ${item.unitCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-400">
                        ${item.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ─── Subtotal General de Insumos Extintores ─── */}
        <div className="flex justify-between items-center bg-stone-800/90 p-3 rounded-xl border border-stone-700 mt-3 font-mono">
          <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">Subtotal Equipamiento Extintores:</span>
          <span className="text-lg font-extrabold text-emerald-300">
            ${grandTotalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </span>
        </div>

        {/* ─── Resumen de Cumplimiento de Normas Oficiales Mexicanas ─── */}
        <div className="mt-4 p-3 bg-stone-950/80 rounded-xl border border-stone-800 space-y-2 text-xs">
          <span className="font-bold text-stone-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Matriz de Cumplimiento de Normatividad Mexicana:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-stone-400">
            <div className="p-2 bg-stone-900 rounded border border-stone-800">
              <strong className="text-stone-200 block">NOM-002-STPS-2010</strong>
              <span>Distancias de recorrido ($\le 15$m alto riesgo / $\le 30$m ordinario) y altura montaje $\le 1.50$m.</span>
            </div>
            <div className="p-2 bg-stone-900 rounded border border-stone-800">
              <strong className="text-stone-200 block">NOM-016-SSA3-2012</strong>
              <span>Compatibilidad en áreas hospitalarias (Quirófanos CO2, CEYE/Lab Agente Limpio, Cocina Clase K).</span>
            </div>
            <div className="p-2 bg-stone-900 rounded border border-stone-800">
              <strong className="text-stone-200 block">NOM-026-STPS-2008</strong>
              <span>Señalización visual obligatoria de ubicación colocada entre 1.80m y 2.00m de altura.</span>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="bg-stone-800 border-stone-700 text-stone-300">
            Cerrar
          </Button>

          <Button
            size="sm"
            onClick={handleAddToBudget}
            disabled={itemsWithPrice.length === 0}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold gap-1.5 shadow-md"
          >
            <PlusCircle className="w-4 h-4" /> Agregar Partidas al Presupuesto Ejecutivos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
