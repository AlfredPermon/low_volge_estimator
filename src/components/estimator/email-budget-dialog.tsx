'use client';

import { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Paperclip,
  Send,
  X,
  Plus,
  FileText,
  AlertCircle,
  Info,
  User,
  Building2,
  Hash,
  RotateCcw,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportBudgetToPDF, PdfMetadata } from '@/lib/pdf-export';
import { LineItem, CalculationResult } from '@/store/estimate-store';
import { formatCurrency } from '@/lib/utils';

export interface EmailBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItems: LineItem[];
  result: CalculationResult;
  meta: PdfMetadata;
}

export function buildDefaultEmailBody(
  meta: PdfMetadata,
  result: CalculationResult,
  lineItems: LineItem[]
): string {
  const fecha = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currency = meta.currency || 'MXN';

  // Agrupar y contar partidas por sistema
  const systemsMap = new Map<string, { count: number; total: number }>();
  for (const item of lineItems) {
    const sys = item.system || 'GENERAL';
    const curr = systemsMap.get(sys) || { count: 0, total: 0 };
    curr.count += 1;
    curr.total += item.total ?? 0;
    systemsMap.set(sys, curr);
  }

  const breakdownLines = Array.from(systemsMap.entries())
    .map(
      ([sys, data]) =>
        `  * ${sys.padEnd(14, ' ')} : ${data.count} partida(s) | Subtotal: ${formatCurrency(
          data.total,
          currency
        )}`
    )
    .join('\n');

  return `Estimado/a cliente / equipo de trabajo,

Por medio del presente correo, me permito compartirles la Propuesta Económica y Presupuesto Paramétrico de Sistemas de Bajo Voltaje correspondiente al proyecto indicado a continuación.

--------------------------------------------------
  INFORMACIÓN GENERAL DEL PROYECTO
--------------------------------------------------
  * Presupuesto         : ${meta.name || 'Presupuesto General'}
  * Cliente             : ${meta.clientName || 'N/A'}
  * Proyecto            : ${meta.projectName || 'N/A'}
  * Revisión / Fecha    : ${meta.revision || 'Rev. 1'} · ${fecha}
  * Responsable         : ${meta.responsible || 'Ejecutivo de Cuenta'}
  * Moneda de Cotización: ${currency}

--------------------------------------------------
  RESUMEN FINANCIERO Y ESTRUCTURA DE COSTOS
--------------------------------------------------
  * Subtotal Directo (Materiales + M.O.) : ${formatCurrency(result.subtotalDirect, currency)}
  * Costos Indirectos                    : ${formatCurrency(result.subtotalIndirects, currency)}
  * Utilidad                             : ${formatCurrency(result.subtotalUtility, currency)}
--------------------------------------------------
  * GRAN TOTAL (Sin IVA)                 : ${formatCurrency(result.grandTotal, currency)}
  * IVA (16%)                            : ${formatCurrency(result.iva, currency)}
  * TOTAL CON IVA INCLUIDO               : ${formatCurrency(result.totalWithIva ?? result.grandTotal, currency)}

--------------------------------------------------
  DESGLOSE POR SISTEMA DE BAJO VOLTAJE
--------------------------------------------------
${breakdownLines || '  (Sin sistemas configurados)'}

--------------------------------------------------
Se adjunta a este correo el documento oficial en formato PDF con el catálogo de conceptos, marcas, modelos, cantidades, precios unitarios e importes desglosados.

${meta.notes ? `NOTAS ADICIONALES:\n${meta.notes}\n--------------------------------------------------\n` : ''}Quedamos a sus apreciables órdenes para cualquier duda o aclaración.

Atentamente,

${meta.responsible || 'Ing. Responsable de Proyecto'}
${meta.clientName ? `Para: ${meta.clientName}` : ''}
`;
}

/**
 * Garantiza que la URI mailto: respete los límites de longitud del SO (Windows 2048 chars max)
 */
function buildSafeMailtoUri(to: string, subject: string, ccList: string[], bodyText: string): string {
  const cleanTo = to.trim();
  const cleanSubject = subject.trim();
  const ccParam = ccList.length > 0 ? `&cc=${encodeURIComponent(ccList.join(';'))}` : '';
  const prefix = `mailto:${encodeURIComponent(cleanTo)}?subject=${encodeURIComponent(cleanSubject)}${ccParam}&body=`;

  // Límite seguro de protocolo mailto en Windows / navegadores: 1900 caracteres totales
  const maxBodyEncodedLength = 1900 - prefix.length;
  let encodedBody = encodeURIComponent(bodyText);

  if (encodedBody.length > maxBodyEncodedLength && maxBodyEncodedLength > 100) {
    const rawLimit = Math.floor(bodyText.length * (maxBodyEncodedLength / encodedBody.length)) - 60;
    const safeBody =
      bodyText.slice(0, Math.max(100, rawLimit)) +
      '\n\n[...Texto completo disponible en el archivo PDF adjunto]';
    encodedBody = encodeURIComponent(safeBody);
  }

  return prefix + encodedBody;
}

export default function EmailBudgetDialog({
  open,
  onOpenChange,
  lineItems,
  result,
  meta,
}: EmailBudgetDialogProps) {
  const [to, setTo] = useState('');
  const [ccList, setCcList] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Inicializar o restablecer el cuerpo del correo al abrir el modal o cambiar props
  useEffect(() => {
    if (open) {
      setBodyText(buildDefaultEmailBody(meta, result, lineItems));
      setSubject(
        `Presupuesto Paramétrico - ${meta.name || 'Bajo Voltaje'}${
          meta.clientName ? ` | ${meta.clientName}` : ''
        }${meta.revision ? ` | ${meta.revision}` : ''}`
      );
    }
  }, [open, meta, result, lineItems]);

  const cleanName = (meta.name || 'presupuesto')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const cleanRevision = (meta.revision || 'rev-1').replace(/\s+/g, '-');
  const attachmentName = `${cleanName}_${cleanRevision}.pdf`;

  const addCc = () => {
    const trimmed = ccInput.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Correo CC inválido');
      return;
    }
    if (ccList.includes(trimmed)) {
      toast.info('El correo CC ya fue agregado');
      return;
    }
    setCcList((prev) => [...prev, trimmed]);
    setCcInput('');
  };

  const removeCc = (email: string) => setCcList((prev) => prev.filter((e) => e !== email));

  const handleResetBody = () => {
    setBodyText(buildDefaultEmailBody(meta, result, lineItems));
    toast.success('Cuerpo del correo restablecido a la plantilla original');
  };

  const handleDownloadPdf = () => {
    setIsDownloadingPdf(true);
    try {
      const filename = exportBudgetToPDF(lineItems, result, meta);
      toast.success(`Archivo "${filename}" descargado`);
    } catch (err) {
      console.error('Error generando PDF:', err);
      toast.error('Error al generar el archivo PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendOutlook = () => {
    if (!to.trim()) {
      toast.error('Ingresa al menos un destinatario (Para:)');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      toast.error('El correo del destinatario no es válido');
      return;
    }

    setIsSending(true);
    try {
      // 1. Descargar el reporte PDF automáticamente (sincrónico, ultra-rápido)
      const filename = exportBudgetToPDF(lineItems, result, meta);

      // 2. Construir mailto: optimizado para no exceder límites de SO
      const mailtoUri = buildSafeMailtoUri(to, subject, ccList, bodyText);

      // 3. Abrir cliente de correo mediante elemento <a> sintético
      const link = document.createElement('a');
      link.href = mailtoUri;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Outlook abierto. Adjunta el archivo "${filename}" desde Descargas.`, {
        duration: 8000,
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Error enviando correo:', err);
      toast.error('Error al preparar el correo.');
    } finally {
      setIsSending(false);
    }
  };

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay Glassmorphism */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content con Ancho Completo Horizontal */}
        <DialogPrimitive.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(1380px, 96vw)',
            maxHeight: '92vh',
            zIndex: 51,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '1.25rem',
            overflow: 'hidden',
            boxShadow: '0 32px 80px -12px rgba(0,0,0,0.65)',
          }}
          className="bg-slate-950 text-stone-100 border border-amber-500/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
        >
          {/* ══ HEADER ══════════════════════════════════════════════════════ */}
          <div className="shrink-0 bg-gradient-to-r from-[#1c130b] via-[#2c1a0e] to-[#1c130b] px-8 py-5 border-b border-amber-500/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
                <Mail className="w-6 h-6 text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <DialogPrimitive.Title className="text-white font-black text-xl leading-tight tracking-tight flex items-center gap-2.5">
                  Enviar Presupuesto Paramétrico por Correo
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-amber-200/80 text-sm mt-0.5">
                  Outlook se abrirá con el borrador pre-llenado · El archivo PDF se descargará automáticamente
                </DialogPrimitive.Description>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold tracking-wider px-3 py-1">
                  PRESUPUESTO 2026
                </Badge>
                <DialogPrimitive.Close className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-stone-300 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            {/* Strip informativo */}
            <div className="mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-amber-200/90 font-mono">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                {meta.name || 'Presupuesto General'}
              </span>
              {meta.clientName && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  {meta.clientName}
                </span>
              )}
              {meta.revision && (
                <span className="flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                  {meta.revision}
                </span>
              )}
              <span className="flex items-center gap-1.5 font-bold text-amber-300 ml-auto">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Total con IVA: {formatCurrency(result.totalWithIva ?? result.grandTotal, meta.currency || 'MXN')}
              </span>
            </div>
          </div>

          {/* ══ BODY — 2 Columnas ════════════════════════════════════════════ */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0 bg-slate-950">

            {/* ── COLUMNA IZQUIERDA: Formulario y Cuerpo Editable ─────────── */}
            <div className="lg:w-[540px] shrink-0 flex flex-col border-r border-stone-800 overflow-y-auto">
              <div className="p-6 space-y-5 flex-1">

                <div className="flex items-start gap-3 p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200 leading-relaxed">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    Ingresa el destinatario y edita el cuerpo del mensaje si lo deseas. Al presionar <strong>Enviar con Outlook</strong>, se generará el PDF y se abrirá tu cliente de correo.
                  </p>
                </div>

                {/* Para */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Para <span className="text-red-400 font-normal normal-case">* requerido</span>
                  </Label>
                  <Input
                    id="email-to"
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="destinatario@cliente.com"
                    className="h-11 text-sm bg-stone-900 border-stone-700 text-white focus-visible:ring-amber-500"
                  />
                </div>

                {/* CC */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    CC <span className="text-stone-400 font-normal normal-case">(opcional)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="email-cc"
                      type="email"
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addCc();
                        }
                      }}
                      placeholder="copia@empresa.com → Presiona Enter"
                      className="h-11 text-sm flex-1 bg-stone-900 border-stone-700 text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCc}
                      className="h-11 w-11 p-0 border-stone-700 text-stone-300 hover:text-amber-400 hover:border-amber-500 bg-stone-900"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {ccList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ccList.map((email) => (
                        <Badge
                          key={email}
                          variant="secondary"
                          className="text-xs bg-stone-800 text-stone-200 border border-stone-700 gap-1.5 pr-1.5 h-6"
                        >
                          {email}
                          <button onClick={() => removeCc(email)} className="hover:text-red-400 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Asunto */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-stone-400" />
                    Asunto
                  </Label>
                  <Input
                    id="email-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-11 text-sm bg-stone-900 border-stone-700 text-white"
                  />
                </div>

                {/* Cuerpo del Correo Editable (Body) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      Cuerpo del Mensaje (Editable)
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetBody}
                      className="h-7 text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 gap-1 px-2"
                      title="Restablecer a la plantilla original"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restablecer Plantilla
                    </Button>
                  </div>
                  <Textarea
                    id="email-body-input"
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={8}
                    className="bg-stone-900 border-stone-700 text-stone-100 text-xs font-mono leading-relaxed focus-visible:ring-amber-500 resize-y"
                    placeholder="Escribe o edita el cuerpo del mensaje..."
                  />
                </div>

                {/* Archivo Adjunto PDF */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-stone-400" />
                    Adjunto PDF Estandarizado
                  </Label>
                  <div className="flex items-center gap-3 p-4 bg-stone-900 border border-stone-800 rounded-xl">
                    <div className="w-11 h-11 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate" title={attachmentName}>
                        {attachmentName}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">Reporte Oficial Presupuesto Bajo Voltaje</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPdf}
                      disabled={isDownloadingPdf}
                      className="h-9 px-3 text-xs text-amber-300 border-amber-500/50 bg-stone-900 hover:bg-stone-800 shrink-0 font-semibold"
                    >
                      <Paperclip className="w-3.5 h-3.5 mr-1" />
                      {isDownloadingPdf ? 'Generando...' : 'Descargar'}
                    </Button>
                  </div>
                </div>

                {/* Datos clave del presupuesto */}
                <div className="rounded-xl border border-stone-800 overflow-hidden bg-stone-900/60">
                  <div className="bg-stone-900 px-4 py-2.5 flex items-center gap-2 border-b border-stone-800">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <p className="text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                      Resumen Financiero del Presupuesto
                    </p>
                  </div>
                  <div className="divide-y divide-stone-800/80 text-xs">
                    <div className="flex items-center justify-between px-4 py-2 text-stone-300">
                      <span>Subtotal Directo:</span>
                      <span className="font-mono font-medium">{formatCurrency(result.subtotalDirect, meta.currency || 'MXN')}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 text-stone-300">
                      <span>Costos Indirectos:</span>
                      <span className="font-mono font-medium">{formatCurrency(result.subtotalIndirects, meta.currency || 'MXN')}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 text-stone-300">
                      <span>Utilidad:</span>
                      <span className="font-mono font-medium">{formatCurrency(result.subtotalUtility, meta.currency || 'MXN')}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 bg-amber-950/20 text-amber-300 font-bold">
                      <span>TOTAL CON IVA:</span>
                      <span className="font-mono">{formatCurrency(result.totalWithIva ?? result.grandTotal, meta.currency || 'MXN')}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ── COLUMNA DERECHA: Vista Previa Mockup Outlook ─────────── */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-stone-900/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" /> Vista Previa del Correo (Outlook Mockup)
                </span>
                <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/40 font-mono">
                  Outlook Draft Mode
                </Badge>
              </div>

              {/* Contenedor Mockup Outlook */}
              <div className="flex-1 overflow-hidden flex flex-col border border-stone-800 rounded-xl shadow-2xl bg-slate-950">
                {/* Barra Azul Outlook */}
                <div className="bg-[#0078d4] px-4 py-2.5 flex items-center justify-between text-white text-xs font-bold shrink-0">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>Nuevo Mensaje - Outlook</span>
                  </div>
                  <span className="text-[11px] opacity-80">Low Voltage Estimator Client</span>
                </div>

                {/* Headers Correo */}
                <div className="bg-stone-950 p-3.5 border-b border-stone-800 space-y-1.5 text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 w-16 font-semibold">Para:</span>
                    <span className="text-amber-400 font-mono">{to || 'destinatario@cliente.com'}</span>
                  </div>
                  {ccList.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-stone-400 w-16 font-semibold">CC:</span>
                      <span className="text-stone-300">{ccList.join('; ')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 w-16 font-semibold">Asunto:</span>
                    <span className="text-white font-semibold truncate">{subject}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1.5 border-t border-stone-800">
                    <span className="text-stone-400 w-16 font-semibold">Adjunto:</span>
                    <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/30 rounded px-2 py-0.5">
                      <FileText className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-200 text-[10px] font-medium truncate max-w-[320px]">{attachmentName}</span>
                    </div>
                  </div>
                </div>

                {/* Cuerpo del Correo Previsualizado en tiempo real */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-900/90 text-stone-200 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                  {bodyText}
                </div>
              </div>

              {/* Alerta de Acción Requerida */}
              <div className="flex items-start gap-3 p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 leading-relaxed shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Importante:</strong> Al presionar <strong>Enviar con Outlook</strong>, se descargará el presupuesto PDF oficial y se abrirá tu borrador en Outlook listo para adjuntar.
                </p>
              </div>
            </div>

          </div>

          {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
          <div className="shrink-0 border-t border-stone-800 bg-slate-950 px-8 py-4 flex items-center justify-between gap-4">
            <p className="text-xs text-stone-400">
              Low Voltage Estimator · Módulo Presupuesto de Bajo Voltaje
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="bg-stone-900 border-stone-700 text-stone-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendOutlook}
                disabled={isSending}
                className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-bold gap-2 shadow-lg shadow-amber-950/50 px-6"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Preparando...' : 'Enviar con Outlook'}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
