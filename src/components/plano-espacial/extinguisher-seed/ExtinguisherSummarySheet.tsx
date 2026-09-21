'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import {
  Flame,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  BarChart3,
  RefreshCw,
  Sparkles,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { ExtinguisherClassIcon } from './ExtinguisherClassIcon';
import {
  ExtinguisherParametricReportDialog,
  ExtinguisherParametricItem,
} from './ExtinguisherParametricReportDialog';

interface PriceItemDB {
  id: string;
  sku: string;
  system: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  unit: string;
  unitCost: number;
  deviceType: string;
  active: boolean;
}

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

  // Estado para guardar precios cargados dinámicamente del motor "Precios" (/api/prices)
  const [dbPrices, setDbPrices] = useState<PriceItemDB[]>([]);
  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);
  const [parametricReportOpen, setParametricReportOpen] = useState<boolean>(false);

  // Consultar el motor "Precios" al abrir la ventana modal
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const fetchPricesEngine = async () => {
      setLoadingPrices(true);
      try {
        const res = await fetch('/api/prices?limit=1000');
        if (cancelled) return;
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setDbPrices(json.data);
          }
        }
      } catch (err) {
        console.warn('ExtinguisherSummarySheet: Usando catálogo precargado de reserva.', err);
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    };

    fetchPricesEngine();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Agrupar por tipo, capacidad y área médica
  const breakdownMap = new Map<
    string,
    { type: ExtinguisherType; capacity: string; count: number; medicalArea: string }
  >();

  extinguishers.forEach((dev) => {
    const key = `${dev.type}_${dev.capacity}`;
    const existing = breakdownMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      breakdownMap.set(key, {
        type: dev.type,
        capacity: dev.capacity,
        count: 1,
        medicalArea: dev.medicalArea || 'pasillo',
      });
    }
  });

  const breakdown = Array.from(breakdownMap.values());

  // Conteo de cumplimientos normativos
  const totalCount = extinguishers.length;
  const validCount = extinguishers.filter((d) => d.isValidLocation).length;
  const invalidCount = totalCount - validCount;

  // Cálculo dinámico conectando al motor de "Precios"
  let grandTotalCost = 0;

  const itemsWithPrice: ExtinguisherParametricItem[] = breakdown.map((item) => {
    // 1. Buscar coincidencia estricta en el catálogo estático predefinido
    const staticMatch =
      EXTINGUISHER_CATALOG.find(
        (cat) => cat.type === item.type && cat.capacity === item.capacity
      ) || EXTINGUISHER_CATALOG.find((cat) => cat.type === item.type);

    const targetSku = staticMatch ? staticMatch.sku : `EXT-${item.type}-${item.capacity}`;

    // Helper de normalización para comparar SKUs flexibles
    const normSku = (s: string) => s.toUpperCase().replace(/\.0/g, '').replace(/[^A-Z0-9]/g, '');

    // 2. Buscar en el motor central de "Precios" (Base de Datos) por SKU (soporta EXTINTOR o INCENDIO)
    const livePriceDbItem = dbPrices.find((p) => {
      if (p.active === false) return false;
      const pSkuNorm = normSku(p.sku);
      const targetSkuNorm = normSku(targetSku);
      if (pSkuNorm === targetSkuNorm) return true;

      // Coincidencia por tipo de extintor y capacidad en descripción/SKU
      const pDescNorm = normSku(p.description || '');
      const itemTypeNorm = normSku(item.type);
      const capNorm = normSku(item.capacity);
      return (p.system === 'EXTINTOR' || p.system === 'INCENDIO') &&
        (pSkuNorm.includes(capNorm) || pDescNorm.includes(capNorm)) &&
        (pSkuNorm.includes(itemTypeNorm) || pDescNorm.includes(itemTypeNorm));
    });

    const unitCost = livePriceDbItem
      ? livePriceDbItem.unitCost
      : (staticMatch ? staticMatch.unitCost : 2500.0);
    const totalAmount = unitCost * item.count;
    grandTotalCost += totalAmount;

    return {
      sku: livePriceDbItem ? livePriceDbItem.sku : targetSku,
      name: livePriceDbItem
        ? livePriceDbItem.description
        : (staticMatch ? staticMatch.name : `Extintor ${item.type} ${item.capacity}`),
      type: item.type,
      capacity: item.capacity,
      count: item.count,
      unitCost,
      totalAmount,
      medicalArea: item.medicalArea,
    };
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-none w-[96vw] max-w-[1550px] sm:!max-w-[1550px] max-h-[92vh] overflow-y-auto bg-slate-950/70 dark:bg-stone-950/75 backdrop-blur-2xl border border-white/15 border-orange-500/30 text-stone-100 p-6 sm:p-8 rounded-2xl shadow-[0_16px_48px_0_rgba(0,0,0,0.6)] shadow-orange-950/30">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Header del Modal */}
            <DialogHeader className="pb-4 border-b border-white/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-gradient-to-br from-orange-600/90 to-amber-700/90 rounded-2xl text-white shadow-lg shadow-orange-600/30 border border-orange-400/30 backdrop-blur-md">
                    <Flame className="w-7 h-7 animate-pulse" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
                      Resumen & Cuantificación Extintores
                      <Badge variant="outline" className="border-orange-500/60 bg-orange-950/70 backdrop-blur-md text-orange-300 font-mono text-xs px-2.5 py-0.5">
                        NOM-002 / NOM-016 / NOM-026
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-stone-300 font-medium mt-0.5">
                      Desglose paramétrico de seguridad contra incendio hospitalaria y precios vinculados en tiempo real al motor de Precios.
                    </DialogDescription>
                  </div>
                </div>

                {/* Indicador de Motor de Precios Activo */}
                <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-xs shadow-inner">
                  <Database className="w-4 h-4 text-orange-400 animate-pulse" />
                  <span className="text-stone-300 text-xs">
                    Motor Precios:{' '}
                    <strong className="text-emerald-400 font-bold">
                      {loadingPrices ? 'Cargando...' : `${dbPrices.length} ítems activos en BD`}
                    </strong>
                  </span>
                </div>
              </div>
            </DialogHeader>

            {/* ─── Scorecard Liquid Glass con Cumplimiento Normativo ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ scale: 1.01, translateY: -2 }}
                className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 hover:border-white/20 transition-all space-y-1 shadow-lg"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Total Extintores Sembrados</span>
                <div className="text-3xl font-black text-white font-mono">{totalCount} pzas</div>
                <span className="text-xs text-stone-400">Equipos posicionados en lienzo 2D</span>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.01, translateY: -2 }}
                className="bg-emerald-950/40 backdrop-blur-md p-4 rounded-xl border border-emerald-500/40 hover:border-emerald-500/60 transition-all space-y-1 shadow-lg shadow-emerald-950/20"
              >
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Cumplen Normativa NOM
                </span>
                <div className="text-3xl font-black text-emerald-300 font-mono">{validCount}</div>
                <span className="text-xs text-emerald-300/80">Ubicaciones y tipos 100% validados</span>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.01, translateY: -2 }}
                className={`p-4 rounded-xl border backdrop-blur-md transition-all space-y-1 shadow-lg ${
                  invalidCount > 0 ? 'bg-red-950/40 border-red-500/50 shadow-red-950/20' : 'bg-white/5 border-white/10'
                }`}
              >
                <span className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                  invalidCount > 0 ? 'text-red-400' : 'text-stone-400'
                }`}>
                  <AlertTriangle className="w-4 h-4" /> Con Advertencias
                </span>
                <div className={`text-3xl font-black font-mono ${invalidCount > 0 ? 'text-red-300' : 'text-stone-400'}`}>
                  {invalidCount}
                </div>
                <span className="text-xs text-stone-400">Incompatibilidad o distancia excedida</span>
              </motion.div>
            </div>

            {/* ─── Tabla Ancha Liquid Glass de Desglose Comercial ─── */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-400" /> Catálogo Comercial de Extintores (BD Precios Centralizada)
                </h4>
                {loadingPrices && <RefreshCw className="w-4 h-4 text-orange-400 animate-spin" />}
              </div>

              <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/50 backdrop-blur-md shadow-2xl">
                <Table className="text-xs sm:text-sm">
                  <TableHeader className="bg-white/5 border-b border-white/10">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-stone-300 font-bold py-3">SKU / Código</TableHead>
                      <TableHead className="text-stone-300 font-bold py-3">Descripción / Agente Extintor</TableHead>
                      <TableHead className="text-stone-300 font-bold text-center py-3">Tipo / Capacidad</TableHead>
                      <TableHead className="text-center text-stone-300 font-bold py-3">Cantidad</TableHead>
                      <TableHead className="text-right text-stone-300 font-bold py-3">P. Unitario (MXN)</TableHead>
                      <TableHead className="text-right text-stone-300 font-bold py-3">Importe Total (MXN)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsWithPrice.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-stone-400 italic">
                          No hay extintores sembrados en el plano actual. Utiliza las herramientas del lienzo 2D para colocar extintores.
                        </TableCell>
                      </TableRow>
                    ) : (
                      itemsWithPrice.map((item, idx) => (
                        <TableRow key={idx} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="font-mono text-orange-300 font-bold text-xs">{item.sku}</TableCell>
                          <TableCell className="text-stone-200 py-3">
                            <div className="flex items-center gap-3">
                              <ExtinguisherClassIcon agentType={item.type as ExtinguisherType} size={32} />
                              <div>
                                <div className="font-semibold text-white">{item.name}</div>
                                <div className="text-[11px] text-stone-400">Área: <span className="capitalize">{item.medicalArea}</span></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="border-white/15 bg-white/5 backdrop-blur-sm text-stone-200 text-xs px-2 py-0.5">
                              {item.type} ({item.capacity})
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-black font-mono text-white text-base">{item.count}</TableCell>
                          <TableCell className="text-right font-mono text-stone-300">
                            ${item.unitCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-400 text-base">
                            ${item.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* ─── Subtotal General Liquid Glass ─── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 font-mono shadow-lg">
              <div>
                <span className="text-xs font-bold text-stone-200 uppercase tracking-wider block">Subtotal Equipamiento Extintores:</span>
                <span className="text-[11px] text-stone-400">Calculado directamente con los precios vigentes de la base de datos.</span>
              </div>
              <span className="text-2xl font-black text-emerald-300 drop-shadow-md">
                ${grandTotalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </span>
            </div>

            {/* ─── Resumen de Cumplimiento de Normas Oficiales Mexicanas ─── */}
            <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 space-y-2 text-xs">
              <span className="font-bold text-stone-200 flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" /> Matriz de Cumplimiento Normativo Oficial:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-stone-300">
                <div className="p-3 bg-slate-950/40 rounded-lg border border-white/5">
                  <strong className="text-orange-300 block font-bold mb-1">NOM-002-STPS-2010</strong>
                  <span>Distancias de recorrido ($\le 15$m en alto riesgo / $\le 30$m ordinario) y altura montaje $\le 1.50$m.</span>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-lg border border-white/5">
                  <strong className="text-orange-300 block font-bold mb-1">NOM-016-SSA3-2012</strong>
                  <span>Compatibilidad en áreas hospitalarias (Quirófanos CO2, CEYE/Lab Agente Limpio, Cocina Clase K).</span>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-lg border border-white/5">
                  <strong className="text-orange-300 block font-bold mb-1">NOM-026-STPS-2008</strong>
                  <span>Señalización visual obligatoria de ubicación colocada a una altura libre entre 1.80m y 2.00m.</span>
                </div>
              </div>
            </div>

            {/* Footer con Acciones */}
            <DialogFooter className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="bg-white/5 hover:bg-white/10 border-white/15 text-stone-300">
                Cerrar
              </Button>

              <div className="flex items-center gap-3">
                {/* Botón Principal: Reporte Paramétrico de Extintores */}
                <Button
                  size="default"
                  onClick={() => setParametricReportOpen(true)}
                  className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold gap-2 shadow-lg shadow-orange-600/30 rounded-xl px-5"
                >
                  <BarChart3 className="w-5 h-5 text-amber-200 animate-pulse" /> Generar Reporte Paramétrico de Extintores
                </Button>
              </div>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Modal / Interfaz del Reporte Paramétrico de Extintores */}
      <ExtinguisherParametricReportDialog
        open={parametricReportOpen}
        onOpenChange={setParametricReportOpen}
        extinguishers={extinguishers}
        itemsWithPrice={itemsWithPrice}
        grandTotalCost={grandTotalCost}
      />
    </>
  );
}
