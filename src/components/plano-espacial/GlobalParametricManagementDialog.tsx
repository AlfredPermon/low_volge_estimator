'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEstimateStore } from '@/store/estimate-store';
import { useFireStore } from '@/store/useFireStore';
import { useEmergencyStore } from '@/store/useEmergencyStore';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  SlidersHorizontal,
  Flame,
  DoorOpen,
  Printer,
  FileSpreadsheet,
  Building2,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  Download,
  AlertTriangle,
  FolderTree,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  calculateGlobalParametrics,
  GlobalParametricsCalculationResult,
} from '@/lib/global-parametric-calculator';
import {
  exportGlobalExtinguisherReportToPDF,
  exportGlobalEmergencySignageReportToPDF,
} from '@/lib/pdf-export';

interface PriceItemDB {
  id: string;
  sku: string;
  description: string;
  unitCost: number;
  system: string;
  active: boolean;
}

interface GlobalParametricManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabType = 'overview' | 'extinguishers' | 'emergency_exit';

export function GlobalParametricManagementDialog({
  open,
  onOpenChange,
}: GlobalParametricManagementDialogProps) {
  const store = useEstimateStore();
  const fireStore = useFireStore();
  const emergencyStore = useEmergencyStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dbPrices, setDbPrices] = useState<PriceItemDB[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const estimateName = store.name;
  const clientName = store.clientName;
  const projectName = store.projectName || estimateName || 'Proyecto General';
  const currency = store.currency || 'MXN';
  const revision = store.revision || 'Rev. 1';
  const responsible = store.responsible;
  const riskResponsable = store.riskResponsable;
  const ivaRate = store.factors?.ivaRate ?? 0.16;
  const currentDate = new Date().toLocaleDateString('es-MX');

  // Cargar precios de la base de datos (/api/prices)
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const fetchPrices = async () => {
      setIsLoadingPrices(true);
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
        console.error('Error consultando motor de precios:', err);
      } finally {
        if (!cancelled) setIsLoadingPrices(false);
      }
    };

    fetchPrices();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Ejecutar motor aritmético global de consolidación de todos los pisos
  const globalData: GlobalParametricsCalculationResult = useMemo(() => {
    return calculateGlobalParametrics({
      buildingLevels: store.buildingLevels || [],
      floorplans: store.floorplans || [],
      activeFloorplanId: store.activeFloorplanId,
      activeExtinguishers: fireStore.extinguishers,
      activeEmergencyDevices: emergencyStore.devices,
      dbPrices,
      ivaRate,
    });
  }, [
    store.buildingLevels,
    store.floorplans,
    store.activeFloorplanId,
    fireStore.extinguishers,
    emergencyStore.devices,
    dbPrices,
    ivaRate,
  ]);

  // Metadatos para exportación PDF
  const pdfExtMeta = {
    projectName,
    clientName: clientName || 'Cliente General',
    responsible: riskResponsable || responsible || 'Control de Riesgos',
    riskResponsable: riskResponsable || 'Control de Riesgos',
    generatedDate: currentDate,
    revision,
    currency,
    subtotalAmount: globalData.extinguishers.subtotalAmount,
    ivaRate: globalData.extinguishers.ivaRate,
    ivaAmount: globalData.extinguishers.ivaAmount,
    totalWithIva: globalData.extinguishers.totalWithIva,
    totalCount: globalData.extinguishers.totalCount,
    validCount: globalData.extinguishers.validCount,
    totalLevelsCount: globalData.totalLevelsCount,
  };

  const pdfEmgMeta = {
    projectName,
    clientName: clientName || 'Cliente General',
    responsible: riskResponsable || responsible || 'Control de Riesgos',
    riskResponsable: riskResponsable || 'Control de Riesgos',
    generatedDate: currentDate,
    revision,
    currency,
    subtotalMaterials: globalData.emergencyExit.subtotalMaterials,
    subtotalInstall: globalData.emergencyExit.subtotalInstall,
    subtotalAmount: globalData.emergencyExit.subtotalAmount,
    ivaRate: globalData.emergencyExit.ivaRate,
    ivaAmount: globalData.emergencyExit.ivaAmount,
    totalWithIva: globalData.emergencyExit.totalWithIva,
    totalCount: globalData.emergencyExit.totalCount,
    validCount: globalData.emergencyExit.validCount,
    compliancePercent: globalData.emergencyExit.compliancePercent,
    totalLevelsCount: globalData.totalLevelsCount,
  };

  // Handlers de impresión / descarga de PDF
  const handlePrintExtinguishers = () => {
    try {
      exportGlobalExtinguisherReportToPDF(
        globalData.extinguishers.consolidatedItems,
        pdfExtMeta,
        globalData.extinguishers.levelsBreakdown
      );
      toast.success('Reporte PDF del Paramétrico Global de Extintores descargado');
    } catch (err) {
      console.error('Error al exportar PDF Global Extintores:', err);
      toast.error('Error al generar el reporte PDF de Extintores');
    }
  };

  const handlePrintEmergencyExit = () => {
    try {
      exportGlobalEmergencySignageReportToPDF(
        globalData.emergencyExit.consolidatedItems,
        pdfEmgMeta,
        globalData.emergencyExit.levelsBreakdown
      );
      toast.success('Reporte PDF del Paramétrico Global NOM-026 descargado');
    } catch (err) {
      console.error('Error al exportar PDF Global NOM-026:', err);
      toast.error('Error al generar el reporte PDF de Señalización NOM-026');
    }
  };

  const handlePrintBoth = async () => {
    setIsExporting(true);
    try {
      handlePrintExtinguishers();
      // Pequeño retardo para que el navegador procese ambas descargas por separado
      await new Promise((resolve) => setTimeout(resolve, 800));
      handlePrintEmergencyExit();
      toast.success('Se han generado ambos Paramétricos Globales de forma independiente');
    } catch (err) {
      toast.error('Error al generar los reportes');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-y-auto bg-stone-950/95 backdrop-blur-2xl border border-stone-800 text-stone-100 p-4 sm:p-6 lg:p-7 rounded-2xl shadow-2xl custom-scrollbar">
        {/* ─── Encabezado Principal ────────────────────────────────────────── */}
        <DialogHeader className="pb-4 border-b border-stone-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-br from-amber-600/90 to-amber-800/90 rounded-2xl text-white shadow-lg shadow-amber-900/40 border border-amber-500/30 shrink-0">
                <SlidersHorizontal className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                    Módulo de Gestión Global
                  </span>
                  <Badge
                    variant="outline"
                    className="border-amber-500/50 bg-amber-950/60 text-amber-300 font-mono text-[10px] px-2 py-0"
                  >
                    Edificio Completo · {globalData.totalLevelsCount} Niveles
                  </Badge>
                  {isLoadingPrices && (
                    <Badge variant="secondary" className="bg-stone-800 text-stone-300 text-[10px] gap-1">
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400" /> Sincronizando Precios BD...
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                  Gestión de Paramétricos Globales
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-stone-400 font-medium">
                  Consolidación aritmética de todos los pisos: <strong className="text-stone-200">{projectName}</strong>
                </DialogDescription>
              </div>
            </div>

            {/* Botón de Descarga Dual Rápida en Header */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="default"
                size="sm"
                onClick={handlePrintBoth}
                disabled={isExporting}
                className="w-full md:w-auto h-9 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1.5 shadow-md border border-amber-400"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando PDFs...
                  </>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5" /> Imprimir Ambos Paramétricos
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ─── Tarjetas Scorecards Ejecutivas (KPIs del Edificio) ─────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-2">
          {/* Card 1: Extintores Globales */}
          <div className="p-3.5 rounded-xl bg-stone-900/90 border border-orange-500/30 flex items-center justify-between shadow-inner">
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">
                Extintores Globales
              </span>
              <div className="text-xl font-extrabold text-white flex items-baseline gap-1.5">
                {globalData.extinguishers.totalCount} <span className="text-xs font-normal text-stone-400">PZA</span>
              </div>
              <span className="text-xs font-bold text-orange-300/90 block truncate">
                {formatCurrency(globalData.extinguishers.totalWithIva, currency)}
              </span>
            </div>
            <div className="p-2.5 bg-orange-950/70 text-orange-400 rounded-xl border border-orange-600/40 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Señalética NOM-026 Global */}
          <div className="p-3.5 rounded-xl bg-stone-900/90 border border-emerald-500/30 flex items-center justify-between shadow-inner">
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Señalización NOM-026
              </span>
              <div className="text-xl font-extrabold text-white flex items-baseline gap-1.5">
                {globalData.emergencyExit.totalCount} <span className="text-xs font-normal text-stone-400">PZA</span>
              </div>
              <span className="text-xs font-bold text-emerald-300/90 block truncate">
                {formatCurrency(globalData.emergencyExit.totalWithIva, currency)}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-950/70 text-emerald-400 rounded-xl border border-emerald-600/40 shrink-0">
              <DoorOpen className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Gran Total Combinado */}
          <div className="p-3.5 rounded-xl bg-stone-900/90 border border-amber-500/30 flex items-center justify-between shadow-inner">
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Inversión Paramétrica Total
              </span>
              <div className="text-xl font-extrabold text-white truncate">
                {formatCurrency(globalData.grandTotalCombined, currency)}
              </div>
              <span className="text-[10px] text-stone-400 block">Con IVA ({Math.round(ivaRate * 100)}%) Incluido</span>
            </div>
            <div className="p-2.5 bg-amber-950/70 text-amber-400 rounded-xl border border-amber-600/40 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Cobertura de Niveles */}
          <div className="p-3.5 rounded-xl bg-stone-900/90 border border-cyan-500/30 flex items-center justify-between shadow-inner">
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                Niveles y Pisos
              </span>
              <div className="text-xl font-extrabold text-white flex items-baseline gap-1.5">
                {globalData.totalLevelsCount} <span className="text-xs font-normal text-stone-400">Pisos</span>
              </div>
              <span className="text-[10px] text-stone-400 block truncate">
                Planta Baja hasta {store.buildingLevels?.[store.buildingLevels.length - 1]?.name || 'Azotea'}
              </span>
            </div>
            <div className="p-2.5 bg-cyan-950/70 text-cyan-400 rounded-xl border border-cyan-600/40 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ─── Pestañas de Navegación del Modal ────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-stone-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-stone-800 text-white border border-stone-700 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            Resumen Integral por Pisos
          </button>

          <button
            onClick={() => setActiveTab('extinguishers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'extinguishers'
                ? 'bg-orange-950 text-orange-200 border border-orange-600/60 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            Paramétrico Extintores (EXTINGUISHER)
            <Badge variant="outline" className="text-[10px] px-1 py-0 border-orange-500/50 bg-orange-950/80 text-orange-300">
              {globalData.extinguishers.totalCount}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('emergency_exit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'emergency_exit'
                ? 'bg-emerald-950 text-emerald-200 border border-emerald-600/60 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
            Paramétrico Señalización (EMERGENCY EXIT)
            <Badge variant="outline" className="text-[10px] px-1 py-0 border-emerald-500/50 bg-emerald-950/80 text-emerald-300">
              {globalData.emergencyExit.totalCount}
            </Badge>
          </button>
        </div>

        {/* ─── Contenido según la Pestaña Activa ───────────────────────────── */}
        <div className="py-2 space-y-6">
          {/* TAB 1: RESUMEN INTEGRAL (Matriz por Piso Lado a Lado) */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">
                      Matriz de Distribución Paramétrica por Nivel de Edificio
                    </h4>
                  </div>
                  <span className="text-xs text-stone-400">
                    {globalData.totalLevelsCount} Niveles analizados
                  </span>
                </div>

                <div className="rounded-xl border border-stone-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-stone-900">
                      <TableRow className="border-stone-800 hover:bg-stone-900 text-stone-300 text-xs">
                        <TableHead className="font-bold text-stone-200">Nivel / Piso</TableHead>
                        <TableHead className="text-center font-bold text-orange-400">Extintores (PZA)</TableHead>
                        <TableHead className="text-right font-bold text-orange-400">Subtotal Extintores</TableHead>
                        <TableHead className="text-center font-bold text-emerald-400">Señales NOM-026</TableHead>
                        <TableHead className="text-right font-bold text-emerald-400">Subtotal Señalética</TableHead>
                        <TableHead className="text-right font-bold text-amber-400">Subtotal Piso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {globalData.extinguishers.levelsBreakdown.map((extLvl, idx) => {
                        const emgLvl = globalData.emergencyExit.levelsBreakdown[idx] || {
                          count: 0,
                          subtotalAmount: 0,
                        };
                        const floorSubtotal = extLvl.subtotalAmount + emgLvl.subtotalAmount;

                        return (
                          <TableRow key={extLvl.levelId} className="border-stone-800/60 hover:bg-stone-900/40">
                            <TableCell className="font-bold text-stone-200 flex items-center gap-1.5">
                              <Badge variant="outline" className="border-stone-700 bg-stone-900 text-[10px] font-mono">
                                {extLvl.levelCode}
                              </Badge>
                              {extLvl.levelName}
                            </TableCell>
                            <TableCell className="text-center font-medium text-stone-300">
                              {extLvl.count > 0 ? (
                                <span className="font-bold text-orange-300">{extLvl.count}</span>
                              ) : (
                                <span className="text-stone-600">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-stone-300">
                              {formatCurrency(extLvl.subtotalAmount, currency)}
                            </TableCell>
                            <TableCell className="text-center font-medium text-stone-300">
                              {emgLvl.count > 0 ? (
                                <span className="font-bold text-emerald-300">{emgLvl.count}</span>
                              ) : (
                                <span className="text-stone-600">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-stone-300">
                              {formatCurrency(emgLvl.subtotalAmount, currency)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-amber-300">
                              {formatCurrency(floorSubtotal, currency)}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* Fila Totalizadora */}
                      <TableRow className="border-stone-700 bg-stone-900 font-bold text-xs">
                        <TableCell className="text-stone-100 uppercase">
                          TOTAL CONSOLIDADO EDIFICIO
                        </TableCell>
                        <TableCell className="text-center text-orange-400 font-extrabold">
                          {globalData.extinguishers.totalCount}
                        </TableCell>
                        <TableCell className="text-right text-orange-400 font-extrabold font-mono">
                          {formatCurrency(globalData.extinguishers.subtotalAmount, currency)}
                        </TableCell>
                        <TableCell className="text-center text-emerald-400 font-extrabold">
                          {globalData.emergencyExit.totalCount}
                        </TableCell>
                        <TableCell className="text-right text-emerald-400 font-extrabold font-mono">
                          {formatCurrency(globalData.emergencyExit.subtotalAmount, currency)}
                        </TableCell>
                        <TableCell className="text-right text-amber-400 font-black font-mono">
                          {formatCurrency(
                            globalData.extinguishers.subtotalAmount + globalData.emergencyExit.subtotalAmount,
                            currency
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Acciones de Impresión por Separado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handlePrintExtinguishers}
                  className="bg-orange-950/70 hover:bg-orange-900 text-orange-200 border-orange-600/70 h-11 text-xs font-bold gap-2"
                >
                  <Flame className="w-4 h-4 text-orange-400" />
                  Imprimir PDF Global de Extintores
                </Button>

                <Button
                  variant="outline"
                  size="default"
                  onClick={handlePrintEmergencyExit}
                  className="bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border-emerald-600/70 h-11 text-xs font-bold gap-2"
                >
                  <DoorOpen className="w-4 h-4 text-emerald-400" />
                  Imprimir PDF Global de Señalización NOM-026
                </Button>
              </div>
            </motion.div>
          )}

          {/* TAB 2: EXTINGUISHERS (Detalle Paramétrico Global de Extintores) */}
          {activeTab === 'extinguishers' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pb-1 border-b border-orange-950/60">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Desglose Paramétrico Consolidado de Extintores (Todos los Pisos)
                    </h4>
                    <span className="text-xs text-stone-400">
                      Cumplimiento oficial NOM-002-STPS-2010 y NOM-016-SSA3-2012
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={handlePrintExtinguishers}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs gap-1.5 shadow-md border border-orange-400"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Reporte PDF Extintores
                </Button>
              </div>

              {/* Tabla de BOM Consolidado */}
              <div className="rounded-xl border border-stone-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-stone-900">
                    <TableRow className="border-stone-800 hover:bg-stone-900 text-stone-300 text-xs">
                      <TableHead className="font-bold text-stone-200">Partida</TableHead>
                      <TableHead className="font-bold text-stone-200">Modelo / SKU</TableHead>
                      <TableHead className="font-bold text-stone-200">Descripción del Extintor</TableHead>
                      <TableHead className="font-bold text-stone-200">Ubicaciones / Áreas</TableHead>
                      <TableHead className="text-center font-bold text-stone-200">Un</TableHead>
                      <TableHead className="text-right font-bold text-stone-200">Cant Global</TableHead>
                      <TableHead className="text-right font-bold text-stone-200">P.U. (MXN)</TableHead>
                      <TableHead className="text-right font-bold text-orange-400">Importe (MXN)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {globalData.extinguishers.consolidatedItems.length > 0 ? (
                      globalData.extinguishers.consolidatedItems.map((item, idx) => (
                        <TableRow key={item.sku + idx} className="border-stone-800/60 hover:bg-stone-900/40">
                          <TableCell className="font-mono text-stone-400">
                            5.7.6.{String(idx + 1).padStart(2, '0')}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-orange-300">
                            {item.sku}
                          </TableCell>
                          <TableCell className="font-medium text-stone-200">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-stone-400 text-[11px] max-w-50 truncate" title={item.medicalArea}>
                            {item.medicalArea}
                          </TableCell>
                          <TableCell className="text-center text-stone-400">PZA</TableCell>
                          <TableCell className="text-right font-bold text-white">
                            {item.count}
                          </TableCell>
                          <TableCell className="text-right font-mono text-stone-300">
                            {formatCurrency(item.unitCost, currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-orange-400">
                            {formatCurrency(item.totalAmount, currency)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-stone-500">
                          No se han sembrado extintores en ningún piso del edificio.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Resumen Financiero de Extintores */}
              <div className="flex justify-end">
                <div className="w-full sm:w-80 p-3.5 bg-stone-900 rounded-xl border border-stone-800 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-400">
                    <span>Subtotal Equipamiento:</span>
                    <span className="font-mono font-semibold text-stone-200">
                      {formatCurrency(globalData.extinguishers.subtotalAmount, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>IVA ({Math.round(ivaRate * 100)}%):</span>
                    <span className="font-mono font-semibold text-stone-200">
                      {formatCurrency(globalData.extinguishers.ivaAmount, currency)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-stone-800 flex justify-between font-bold text-sm text-orange-400">
                    <span>Total Extintores con IVA:</span>
                    <span className="font-mono">
                      {formatCurrency(globalData.extinguishers.totalWithIva, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: EMERGENCY EXIT (Detalle Paramétrico Global NOM-026) */}
          {activeTab === 'emergency_exit' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pb-1 border-b border-emerald-950/60">
                <div className="flex items-center gap-2">
                  <DoorOpen className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Desglose Paramétrico Consolidado de Señalización NOM-026 (Todos los Pisos)
                    </h4>
                    <span className="text-xs text-stone-400">
                      Cumplimiento oficial NOM-026-STPS-2008 · Fórmulas de Visibilidad S &gt;= L^2 / 2000
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={handlePrintEmergencyExit}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md border border-emerald-400"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Reporte PDF NOM-026
                </Button>
              </div>

              {/* Tabla de BOM Consolidado NOM-026 */}
              <div className="rounded-xl border border-stone-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-stone-900">
                    <TableRow className="border-stone-800 hover:bg-stone-900 text-stone-300 text-xs">
                      <TableHead className="font-bold text-stone-200">Partida</TableHead>
                      <TableHead className="font-bold text-stone-200">SKU</TableHead>
                      <TableHead className="font-bold text-stone-200">Categoría NOM-026</TableHead>
                      <TableHead className="font-bold text-stone-200">Material y Montaje</TableHead>
                      <TableHead className="text-center font-bold text-stone-200">Un</TableHead>
                      <TableHead className="text-right font-bold text-stone-200">Cant Global</TableHead>
                      <TableHead className="text-right font-bold text-stone-200">P.U. Suministro</TableHead>
                      <TableHead className="text-right font-bold text-stone-200">P.U. Instalación</TableHead>
                      <TableHead className="text-right font-bold text-emerald-400">Importe Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {globalData.emergencyExit.consolidatedItems.length > 0 ? (
                      globalData.emergencyExit.consolidatedItems.map((item, idx) => (
                        <TableRow key={item.sku + idx} className="border-stone-800/60 hover:bg-stone-900/40">
                          <TableCell className="font-mono text-stone-400">
                            5.8.1.{String(idx + 1).padStart(2, '0')}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-emerald-300">
                            {item.sku}
                          </TableCell>
                          <TableCell className="font-medium text-stone-200">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-stone-400 text-[11px]">
                            {item.material.replace(/_/g, ' ')} · {item.mountingType.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-center text-stone-400">PZA</TableCell>
                          <TableCell className="text-right font-bold text-white">
                            {item.count}
                          </TableCell>
                          <TableCell className="text-right font-mono text-stone-300">
                            {formatCurrency(item.unitCost, currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-stone-300">
                            {formatCurrency(item.installCost, currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-400">
                            {formatCurrency(item.totalAmount, currency)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-6 text-stone-500">
                          No se han sembrado señales de emergencia NOM-026 en ningún piso del edificio.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Resumen Financiero NOM-026 */}
              <div className="flex justify-end">
                <div className="w-full sm:w-80 p-3.5 bg-stone-900 rounded-xl border border-stone-800 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-400">
                    <span>Suministro de Materiales:</span>
                    <span className="font-mono font-semibold text-stone-200">
                      {formatCurrency(globalData.emergencyExit.subtotalMaterials, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Mano de Obra e Instalación:</span>
                    <span className="font-mono font-semibold text-stone-200">
                      {formatCurrency(globalData.emergencyExit.subtotalInstall, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Subtotal General:</span>
                    <span className="font-mono font-semibold text-stone-200">
                      {formatCurrency(globalData.emergencyExit.subtotalAmount, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>IVA ({Math.round(ivaRate * 100)}%):</span>
                    <span className="font-mono font-semibold text-stone-200">
                      {formatCurrency(globalData.emergencyExit.ivaAmount, currency)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-stone-800 flex justify-between font-bold text-sm text-emerald-400">
                    <span>Total NOM-026 con IVA:</span>
                    <span className="font-mono">
                      {formatCurrency(globalData.emergencyExit.totalWithIva, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ─── Footer del Modal ───────────────────────────────────────────── */}
        <DialogFooter className="border-t border-stone-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Reportes generados con estricto apego a normas STPS y fórmulas de visibilidad.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700 text-xs"
            >
              Cerrar
            </Button>

            <Button
              size="sm"
              onClick={handlePrintBoth}
              disabled={isExporting}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs gap-1.5 shadow-md border border-amber-400"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Ambos Paramétricos (Por Separado)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
