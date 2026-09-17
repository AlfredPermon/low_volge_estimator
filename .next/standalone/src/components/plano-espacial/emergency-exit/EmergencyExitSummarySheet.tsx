'use client';

import React from 'react';
import { useEmergencyStore } from '@/store/useEmergencyStore';
import { generateEmergencySignageReport } from '@/lib/emergencyNormativeValidator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  FileCheck,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  Printer,
  Download,
  AlertCircle,
  DoorOpen,
} from 'lucide-react';
import { toast } from 'sonner';

interface EmergencyExitSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName?: string;
  floorplanName?: string;
}

export function EmergencyExitSummarySheet({
  open,
  onOpenChange,
  projectName = 'Proyecto Corporativo',
  floorplanName = 'Planta Baja',
}: EmergencyExitSummarySheetProps) {
  const store = useEmergencyStore();
  const report = generateEmergencySignageReport(store.devices);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Dictamen_NOM026_${floorplanName.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Dictamen de Señalización NOM-026 exportado en formato JSON');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-stone-900 text-stone-100 border-stone-800 p-6 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
        <DialogHeader className="border-b border-stone-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-950 border border-emerald-600/50 rounded-xl text-emerald-400">
                <DoorOpen className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Dictamen & Resumen de Señalización NOM-026-STPS-2008
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-400">
                  {projectName} · Plano: <strong className="text-stone-200">{floorplanName}</strong>
                </DialogDescription>
              </div>
            </div>

            <Badge
              className={`text-xs px-3 py-1 font-bold ${
                report.compliancePercent === 100
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              Cumplimiento: {report.compliancePercent}%
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Métricas Principales (Cards Resumen) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-stone-800/80 rounded-xl border border-stone-700 space-y-1">
              <span className="text-[11px] text-stone-400 uppercase font-bold tracking-wider">
                Total de Señales
              </span>
              <div className="text-2xl font-black text-white font-mono">{report.totalSigns} pcs</div>
              <span className="text-[10px] text-emerald-400">En plano activo</span>
            </div>

            <div className="p-3.5 bg-stone-800/80 rounded-xl border border-stone-700 space-y-1">
              <span className="text-[11px] text-stone-400 uppercase font-bold tracking-wider">
                Costo Materiales
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ${report.costs.materialsMxn.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </div>
              <span className="text-[10px] text-stone-400">Acrílico Fotoluminiscente</span>
            </div>

            <div className="p-3.5 bg-stone-800/80 rounded-xl border border-stone-700 space-y-1">
              <span className="text-[11px] text-stone-400 uppercase font-bold tracking-wider">
                Inversión Total (BOM + Inst)
              </span>
              <div className="text-2xl font-black text-white font-mono">
                ${report.costs.grandTotalMxn.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </div>
              <span className="text-[10px] text-stone-400">Incluye Mano de Obra ($65/pc)</span>
            </div>
          </div>

          {/* Desglose Cuantitativo por Categoría */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Desglose de Cuantificación por Tipo de Señal
            </h4>
            <div className="divide-y divide-stone-800 border border-stone-800 rounded-xl overflow-hidden bg-stone-950/60">
              {Object.entries(report.byCategory).map(([catKey, qty]) => {
                const names: Record<string, string> = {
                  SALIDA_DE_EMERGENCIA: '🚪 Salida de Emergencia Directa',
                  RUTA_DE_EVACUACION: '➡️ Ruta de Evacuación (Flecha Direccional)',
                  ESCALERA_DE_EMERGENCIA: '🪜 Escalera de Emergencia',
                  ZONA_DE_SEGURIDAD: '🟢 Zona de Seguridad / Punto de Reunión',
                  PRIMEROS_AUXILIOS: '➕ Estación de Primeros Auxilios',
                };
                return (
                  <div key={catKey} className="flex items-center justify-between p-3 text-xs">
                    <span className="font-semibold text-stone-200">{names[catKey] || catKey}</span>
                    <Badge variant="outline" className="border-stone-700 bg-stone-800 text-stone-100 font-mono">
                      {qty} unidades
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recomendaciones de Seguridad y Alumbrado */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-600/40 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Recomendaciones Normativas (NOM-026-STPS-2008 & Guía de Referencia)
            </div>
            <ul className="list-disc pl-4 text-stone-300 space-y-1 text-[11px]">
              <li>
                Instalar señales fotoluminiscentes en las rutas principales de evacuación para garantizar visibilidad ante cortes de energía eléctrica.
              </li>
              <li>
                Comprobar iluminación mínima de 50 luxes a nivel de la señal.
              </li>
              <li>
                En cruces de pasillos (intersecciones T o en cruz +), colocar la señal direccional entre 3m y 5m antes del cambio de dirección.
              </li>
            </ul>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="h-9 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700 gap-1.5 font-semibold"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Exportar Dictamen JSON
          </Button>

          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4"
          >
            Cerrar Resumen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
