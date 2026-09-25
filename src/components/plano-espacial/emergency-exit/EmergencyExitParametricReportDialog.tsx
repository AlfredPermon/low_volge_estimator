'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EmergencySignDevice, NOM026SignCategory } from '@/types/emergencySignage';
import { useEstimateStore } from '@/store/estimate-store';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DoorOpen,
  Printer,
  ShieldCheck,
  CheckCircle2,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  User,
  Mail,
  Ruler,
  Eye,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  exportEmergencySignageReportToPDF,
  EmergencySignagePdfItem,
  EmergencySignagePdfMetadata,
} from '@/lib/pdf-export';
import { EmailEmergencyExitDialog } from './EmailEmergencyExitDialog';

export interface EmergencyExitParametricItem {
  sku: string;
  name: string;
  category: NOM026SignCategory;
  material: string;
  count: number;
  unitCost: number;
  installCost: number;
  totalAmount: number;
  mountingType: string;
}

interface EmergencyExitParametricReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: EmergencySignDevice[];
  itemsWithPrice: EmergencyExitParametricItem[];
  grandTotalCost: number;
}

export function EmergencyExitParametricReportDialog({
  open,
  onOpenChange,
  devices,
  itemsWithPrice,
  grandTotalCost,
}: EmergencyExitParametricReportDialogProps) {
  const estimateName = useEstimateStore((s) => s.name);
  const clientName = useEstimateStore((s) => s.clientName);
  const projectName = useEstimateStore((s) => s.projectName);
  const currency = useEstimateStore((s) => s.currency);
  const revision = useEstimateStore((s) => s.revision);
  const responsible = useEstimateStore((s) => s.responsible);

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const totalCount = devices.length;
  const validCount = devices.filter((d) => d.isValidLocation).length;
  const compliancePercent = totalCount > 0 ? Math.round((validCount / totalCount) * 100) : 100;
  
  const ivaRate = useEstimateStore((s) => s.factors?.ivaRate) ?? 0.16;
  const subtotalMaterials = itemsWithPrice.reduce((sum, item) => sum + item.unitCost * item.count, 0);
  const subtotalInstall = itemsWithPrice.reduce((sum, item) => sum + item.installCost * item.count, 0);
  const subtotalAmount = grandTotalCost;
  const ivaAmount = subtotalAmount * ivaRate;
  const totalWithIva = subtotalAmount + ivaAmount;

  const pdfMeta: EmergencySignagePdfMetadata = {
    projectName: projectName || estimateName || 'Estimación General',
    clientName: clientName || 'Cliente General',
    responsible: responsible || 'Ing. Responsable de Proyecto',
    revision: revision || 'Rev. 1',
    currency,
    subtotalMaterials,
    subtotalInstall,
    subtotalAmount,
    ivaRate,
    ivaAmount,
    totalWithIva,
    totalCount,
    validCount,
    compliancePercent,
  };

  const categoriesUsed = Array.from(
    new Set(devices.map((d) => d.category))
  );

  const handlePrint = () => {
    try {
      exportEmergencySignageReportToPDF(itemsWithPrice, pdfMeta);
      toast.success('Reporte PDF del Dictamen Paramétrico de Señalización descargado');
    } catch (e) {
      console.error('Error al exportar PDF:', e);
      toast.error('Error al generar el reporte PDF');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-6xl xl:max-w-7xl max-h-[85vh] sm:max-h-[88vh] overflow-y-auto bg-stone-950/90 backdrop-blur-2xl border border-emerald-500/30 text-stone-100 p-4 sm:p-6 lg:p-7 rounded-2xl shadow-[0_16px_48px_0_rgba(0,0,0,0.7)] shadow-emerald-950/40 custom-scrollbar print:bg-white print:text-black print:p-0 print:border-none print:shadow-none print:max-h-none print:w-full print:max-w-none print:rounded-none">
          
          {/* Estilos CSS para Impresión Directa / Generación de PDF */}
          <style>{`
            @page {
              size: letter portrait;
              margin: 12mm 15mm;
            }
            @media print {
              body * {
                visibility: hidden !important;
              }
              .printable-emergency-report, .printable-emergency-report * {
                visibility: visible !important;
              }
              .printable-emergency-report {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                color: #000 !important;
                background: #fff !important;
                font-size: 10pt !important;
              }
              .printable-emergency-report table {
                border-collapse: collapse !important;
                width: 100% !important;
              }
              .printable-emergency-report th, .printable-emergency-report td {
                border: 1px solid #d1d5db !important;
                padding: 6px 8px !important;
              }
              .printable-emergency-report .signature-block {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              .print\\:hidden {
                display: none !important;
              }
            }
          `}</style>

          {/* Contenido imprimible */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="printable-emergency-report space-y-6"
          >
            {/* ─── Encabezado Ejecutivo del Reporte Paramétrico ─── */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10 print:border-stone-400">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl text-white shadow-lg shadow-emerald-600/30 print:bg-emerald-600 print:text-white print:shadow-none">
                  <DoorOpen className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white print:text-black tracking-tight">
                      Estimación Paramétrica de Señalización de Emergencia & Evacuación
                    </h2>
                    <Badge variant="outline" className="border-emerald-500/60 bg-emerald-950/70 text-emerald-300 print:border-emerald-600 print:bg-emerald-100 print:text-emerald-900 font-mono text-xs px-2.5 py-0.5">
                      OFICIAL NOM-026-STPS-2008
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-300 print:text-stone-700 mt-0.5 font-medium">
                    Dictamen ejecutivo de equipamiento, factibilidad económica y auditoría de rutas de evacuación.
                  </p>
                </div>
              </div>

              {/* Metadatos del Proyecto */}
              <div className="bg-white/5 backdrop-blur-md print:bg-stone-50 p-4 rounded-xl border border-white/10 print:border-stone-300 text-xs sm:text-sm space-y-2 min-w-[280px]">
                <div className="flex items-center justify-between text-stone-300 print:text-stone-800">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Building2 className="w-4 h-4 text-emerald-400 print:text-emerald-700" /> Proyecto:
                  </span>
                  <span className="font-extrabold text-white print:text-black">{projectName || estimateName || 'Estimación General'}</span>
                </div>
                <div className="flex items-center justify-between text-stone-300 print:text-stone-800">
                  <span className="flex items-center gap-1.5 font-bold">
                    <User className="w-4 h-4 text-emerald-400 print:text-emerald-700" /> Cliente:
                  </span>
                  <span className="font-semibold">{clientName || 'Cliente General'}</span>
                </div>
                <div className="flex items-center justify-between text-stone-300 print:text-stone-800">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Calendar className="w-4 h-4 text-emerald-400 print:text-emerald-700" /> Revisión / Fecha:
                  </span>
                  <span className="font-mono">{revision || 'Rev. 1'} · {new Date().toLocaleDateString('es-MX')}</span>
                </div>
              </div>
            </div>

            {/* ─── Scorecards Paramétricos Principales Liquid Glass ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/5 backdrop-blur-md print:bg-stone-50 p-4 rounded-xl border border-white/10 print:border-stone-300 space-y-1 shadow-lg print:shadow-none">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 print:text-stone-600">Total Señales Sembradas</span>
                <div className="text-3xl font-black text-white print:text-black font-mono">{totalCount} pzas</div>
                <span className="text-xs text-stone-400 print:text-stone-600">Señales de evacuación en plano 2D</span>
              </div>

              <div className="bg-emerald-950/40 backdrop-blur-md print:bg-emerald-50 p-4 rounded-xl border border-emerald-500/40 print:border-emerald-500 space-y-1 shadow-lg print:shadow-none">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 print:text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Cumplimiento Normativo
                </span>
                <div className="text-3xl font-black text-emerald-300 print:text-emerald-900 font-mono">
                  {compliancePercent}%
                </div>
                <span className="text-xs text-emerald-300/80 print:text-emerald-800">{validCount} de {totalCount} validadas NOM-026</span>
              </div>

              <div className="bg-teal-950/40 backdrop-blur-md print:bg-teal-50 p-4 rounded-xl border border-teal-500/40 print:border-teal-500 space-y-1 shadow-lg print:shadow-none">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400 print:text-teal-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> Subtotal Inversión
                </span>
                <div className="text-2xl font-black text-teal-300 print:text-teal-900 font-mono">
                  {formatCurrency(subtotalAmount, currency)}
                </div>
                <span className="text-xs text-teal-300/80 print:text-teal-900">BOM Materiales + Inst. ($65/pc)</span>
              </div>

              <div className="bg-cyan-950/40 backdrop-blur-md print:bg-cyan-50 p-4 rounded-xl border border-cyan-500/40 print:border-cyan-500 space-y-1 shadow-lg print:shadow-none">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 print:text-cyan-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Tipos de Señal
                </span>
                <div className="text-3xl font-black text-cyan-300 print:text-cyan-900 font-mono">
                  {categoriesUsed.length} categorías
                </div>
                <span className="text-xs text-cyan-300/80 print:text-cyan-900">Salidas, Rutas, Puntos de Reunión</span>
              </div>
            </div>

            {/* ─── Tabla de Cuantificación Comercial con Motor de Precios ─── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-200 print:text-black flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400 print:text-emerald-700" /> Desglose Paramétrico de Señalización NOM-026
                </h3>
                <span className="text-xs text-stone-400 print:text-stone-600 font-mono">Sistema SEÑALETICA / EVACUACION</span>
              </div>

              <div className="border border-white/10 print:border-stone-400 rounded-xl overflow-x-auto bg-stone-950/60 backdrop-blur-md print:bg-white shadow-xl print:shadow-none custom-scrollbar">
                <Table className="text-xs sm:text-sm">
                  <TableHeader className="bg-white/5 print:bg-stone-200">
                    <TableRow className="border-white/10 print:border-stone-400">
                      <TableHead className="text-stone-300 print:text-black font-bold py-3">SKU</TableHead>
                      <TableHead className="text-stone-300 print:text-black font-bold py-3">Descripción Oficial de la Señal</TableHead>
                      <TableHead className="text-stone-300 print:text-black font-bold text-center py-3">Categoría / Material</TableHead>
                      <TableHead className="text-stone-300 print:text-black font-bold text-center py-3">Cantidad</TableHead>
                      <TableHead className="text-stone-300 print:text-black font-bold text-right py-3">P. Unitario ({currency})</TableHead>
                      <TableHead className="text-stone-300 print:text-black font-bold text-right py-3">Importe ({currency})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsWithPrice.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-stone-400 print:text-stone-600 italic">
                          No hay señales de emergencia sembradas en el plano actual.
                        </TableCell>
                      </TableRow>
                    ) : (
                      itemsWithPrice.map((item, idx) => (
                        <TableRow key={idx} className="border-white/5 print:border-stone-300 hover:bg-white/5 transition-colors">
                          <TableCell className="font-mono text-emerald-400 print:text-emerald-950 font-bold">{item.sku}</TableCell>
                          <TableCell className="text-stone-200 print:text-black py-3">
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-[11px] text-stone-400 print:text-stone-600">Soporte: <span className="capitalize">{item.mountingType.replace(/_/g, ' ')}</span></div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="border-white/15 bg-white/5 text-stone-200 print:border-stone-400 print:bg-stone-100 print:text-black text-xs px-2 py-0.5">
                              {item.material.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-white print:text-black text-base">{item.count}</TableCell>
                          <TableCell className="text-right font-mono text-stone-300 print:text-black">
                            {formatCurrency(item.unitCost + item.installCost, currency)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-400 print:text-emerald-900 text-base">
                            {formatCurrency(item.totalAmount, currency)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* ─── Resumen Totales Financieros e Impuestos Liquid Glass ─── */}
            <div className="bg-white/5 backdrop-blur-md print:bg-stone-100 p-4 sm:p-5 rounded-xl border border-white/10 print:border-stone-400 font-mono space-y-2.5 shadow-lg print:shadow-none">
              <div className="flex justify-between items-center text-xs sm:text-sm text-stone-300 print:text-stone-800">
                <span>Subtotal Materiales (Acrílico Fotoluminiscente):</span>
                <span className="font-bold">{formatCurrency(subtotalMaterials, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm text-stone-300 print:text-stone-800">
                <span>Subtotal Mano de Obra e Instalación:</span>
                <span className="font-bold">{formatCurrency(subtotalInstall, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm text-stone-300 print:text-stone-800">
                <span>IVA ({(ivaRate * 100).toFixed(0)}%):</span>
                <span className="font-bold">{formatCurrency(ivaAmount, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-lg sm:text-xl font-black text-emerald-300 print:text-emerald-900 pt-3 border-t border-white/10 print:border-stone-400">
                <span>GRAN TOTAL ESTIMADO CON IVA:</span>
                <span>{formatCurrency(totalWithIva, currency)}</span>
              </div>
            </div>

            {/* ─── Matriz de Normatividad NOM-026 Liquid Glass ─── */}
            <div className="space-y-2.5 pt-2 text-xs sm:text-sm">
              <h4 className="font-bold text-stone-200 print:text-black flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 print:text-emerald-700" /> Matriz Normativa de Señalización (NOM-026-STPS-2008 & Guía de Referencia)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] sm:text-xs">
                <div className="p-3.5 bg-white/5 backdrop-blur-md print:bg-stone-50 rounded-xl border border-white/10 print:border-stone-300 space-y-1">
                  <strong className="text-emerald-400 print:text-emerald-950 block font-bold">Colores de Seguridad & Contraste</strong>
                  <p className="text-stone-300 print:text-stone-800">
                    Fondo Verde de Seguridad (#00A651, Pantone 354C) cubriendo mín. 50% de superficie, símbolos en Blanco Contraste (#FFFFFF).
                  </p>
                </div>
                <div className="p-3.5 bg-white/5 backdrop-blur-md print:bg-stone-50 rounded-xl border border-white/10 print:border-stone-300 space-y-1">
                  <strong className="text-emerald-400 print:text-emerald-950 block font-bold">Cálculo de Dimensión (S ≥ L²/2000)</strong>
                  <p className="text-stone-300 print:text-stone-800">
                    Satisface la fórmula geométrica por distancia de observación L. Mínimo 125 cm² para distancias ≤ 5m.
                  </p>
                </div>
                <div className="p-3.5 bg-white/5 backdrop-blur-md print:bg-stone-50 rounded-xl border border-white/10 print:border-stone-300 space-y-1">
                  <strong className="text-emerald-400 print:text-emerald-950 block font-bold">Altura de Montaje & Fotoluminiscencia</strong>
                  <p className="text-stone-300 print:text-stone-800">
                    Montaje a 2.00m-2.50m (pared/bandera) o sobre marco (1.60m-2.50m). Material fotoluminiscente para apagones.
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Cuadro de Validación y Firmas Ejecutivas ─── */}
            <div className="signature-block pt-8 border-t border-white/10 print:border-stone-400">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 print:text-black mb-8 text-center">
                Cuadro de Firmas y Validación Técnica del Dictamen
              </h4>
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                <div className="space-y-8">
                  <div className="border-b border-stone-600 print:border-black mx-4"></div>
                  <div>
                    <p className="font-bold text-white print:text-black">{responsible || 'Ing. Responsable de Proyecto'}</p>
                    <p className="text-[11px] text-stone-400 print:text-stone-600">Elaboró / Especialista PCI & Señalización</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="border-b border-stone-600 print:border-black mx-4"></div>
                  <div>
                    <p className="font-bold text-white print:text-black">Supervisión Normativa STPS</p>
                    <p className="text-[11px] text-stone-400 print:text-stone-600">Revisó NOM-026-STPS-2008</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="border-b border-stone-600 print:border-black mx-4"></div>
                  <div>
                    <p className="font-bold text-white print:text-black">{clientName || 'Aprobación del Cliente'}</p>
                    <p className="text-[11px] text-stone-400 print:text-stone-600">Aprobó / Cliente Representante</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer del diálogo (oculto al imprimir) */}
          <DialogFooter className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 print:hidden">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="bg-white/5 hover:bg-white/10 border-white/15 text-stone-300">
              Cerrar
            </Button>

            <div className="flex flex-wrap items-center gap-3">
              {/* Botón E-MAIL Outlook */}
              <Button
                size="default"
                onClick={() => setEmailDialogOpen(true)}
                className="bg-[#0078d4] hover:bg-[#005a9e] text-white font-bold gap-2 shadow-lg shadow-blue-900/40 rounded-xl px-5"
              >
                <Mail className="w-5 h-5 text-white" /> E-MAIL
              </Button>

              {/* Botón PDF / Imprimir */}
              <Button
                size="default"
                onClick={handlePrint}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold gap-2 shadow-lg shadow-emerald-600/30 rounded-xl px-5"
              >
                <Printer className="w-5 h-5 text-emerald-100" /> Imprimir / Exportar Reporte PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de envío por E-MAIL tipo Outlook */}
      <EmailEmergencyExitDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        itemsWithPrice={itemsWithPrice}
        meta={pdfMeta}
      />
    </>
  );
}
