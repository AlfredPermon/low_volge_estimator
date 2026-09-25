'use client';

import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  exportExtinguisherReportToPDF,
  ExtinguisherPdfItem,
  ExtinguisherPdfMetadata,
} from '@/lib/pdf-export';
import { formatCurrency } from '@/lib/utils';

interface EmailExtinguisherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsWithPrice: ExtinguisherPdfItem[];
  meta: ExtinguisherPdfMetadata;
}

function buildEmailBody(meta: ExtinguisherPdfMetadata, items: ExtinguisherPdfItem[]): string {
  const fecha = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const currency = meta.currency || 'MXN';

  const breakdownLines = items
    .map(
      (it, idx) =>
        `  ${idx + 1}. [${it.sku}] ${it.name} | Cant: ${it.count} PZA | P.U: ${formatCurrency(it.unitCost, currency)} | Importe: ${formatCurrency(it.totalAmount, currency)}`
    )
    .join('\n');

  return `Estimado/a cliente / equipo de trabajo,

Por medio del presente correo, me permito compartirles el Dictamen de Estimación Paramétrica del Sistema de Extintores & Protección Contra Incendio del proyecto indicado a continuación.

--------------------------------------------------
  INFORMACIÓN DEL PROYECTO
--------------------------------------------------
  * Proyecto            : ${meta.projectName || 'Estimación General'}
  * Cliente             : ${meta.clientName || 'Cliente General'}
  * Responsable Técnica : ${meta.responsible || 'Ing. Responsable de Proyecto'}
  * Revisión / Fecha    : ${meta.revision || 'Rev. 1'} · ${fecha}
  * Moneda              : ${currency}

--------------------------------------------------
  RESUMEN FINANCIERO Y CUMPLIMIENTO NORMAS (STPS/SSA3)
--------------------------------------------------
  * Total Equipos       : ${meta.totalCount} extintores sembrados 2D
  * Validaciones NOM    : ${meta.validCount} de ${meta.totalCount} validados (NOM-002 / NOM-016 / NOM-026)
  * Subtotal Equipos    : ${formatCurrency(meta.subtotalAmount, currency)}
  * IVA (${(meta.ivaRate * 100).toFixed(0)}%)             : ${formatCurrency(meta.ivaAmount, currency)}
  * GRAN TOTAL CON IVA  : ${formatCurrency(meta.totalWithIva, currency)}

--------------------------------------------------
  DESGLOSE DE EQUIPAMIENTO
--------------------------------------------------
${breakdownLines || '  (Sin partidas sembradas en plano)'}

--------------------------------------------------
Se adjunta el reporte oficial paramétrico en formato PDF con la matriz de cumplimiento normativo hospitalario y cuadro de firmas de validación técnica.

En caso de requerir aclaraciones o ajustes en el dictamen, quedamos a su disposición.

Atentamente,

${meta.responsible || 'Ing. Responsable de Proyecto'}
${meta.clientName ? `Para: ${meta.clientName}` : ''}
`;
}

function buildSafeMailtoUri(to: string, subject: string, ccList: string[], bodyText: string): string {
  const cleanTo = to.trim();
  const cleanSubject = subject.trim();
  const ccParam = ccList.length > 0 ? `&cc=${encodeURIComponent(ccList.join(';'))}` : '';
  const prefix = `mailto:${encodeURIComponent(cleanTo)}?subject=${encodeURIComponent(cleanSubject)}${ccParam}&body=`;

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

export function EmailExtinguisherDialog({
  open,
  onOpenChange,
  itemsWithPrice,
  meta,
}: EmailExtinguisherDialogProps) {
  const [to, setTo] = useState('');
  const [ccList, setCcList] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [subject, setSubject] = useState(
    `Dictamen Paramétrico de Extintores${meta.projectName ? ` | ${meta.projectName}` : ''}`
  );
  const [isSending, setIsSending] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const cleanProjectName = (meta.projectName || 'Proyecto')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const attachmentName = `${cleanProjectName}_Parametrico_Extintores.pdf`;

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
    setCcList((prev: string[]) => [...prev, trimmed]);
    setCcInput('');
  };

  const removeCc = (email: string) => setCcList((prev: string[]) => prev.filter((e: string) => e !== email));

  const handleDownloadPdf = () => {
    setIsDownloadingPdf(true);
    try {
      exportExtinguisherReportToPDF(itemsWithPrice, meta);
      toast.success(`Archivo "${attachmentName}" generado y descargado`);
    } catch {
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
      // 1. Descargar el reporte PDF automáticamente
      exportExtinguisherReportToPDF(itemsWithPrice, meta);

      // 2. Armar el cuerpo seguro y disparar mailto:
      const body = buildEmailBody(meta, itemsWithPrice);
      const mailtoUri = buildSafeMailtoUri(to, subject, ccList, body);

      const link = document.createElement('a');
      link.href = mailtoUri;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Outlook abierto. Adjunta el archivo "${attachmentName}" desde Descargas.`, {
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

  const previewBody = buildEmailBody(meta, itemsWithPrice);

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content con Ancho Completo Horizontal */}
        <DialogPrimitive.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(1200px, 94vw)',
            maxHeight: '88vh',
            zIndex: 51,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '1.25rem',
            overflow: 'hidden',
            boxShadow: '0 32px 80px -12px rgba(0,0,0,0.6)',
          }}
          className="bg-slate-950 text-stone-100 border border-orange-500/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
        >
          {/* ══ HEADER ══════════════════════════════════════════════════════ */}
          <div className="shrink-0 bg-gradient-to-r from-[#0a2e1a] via-[#133d25] to-[#0a2e1a] px-5 py-4 sm:px-8 sm:py-5 border-b border-emerald-500/30">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400 animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <DialogPrimitive.Title className="text-white font-black text-lg sm:text-xl leading-tight tracking-tight flex items-center gap-2.5">
                  Enviar Dictamen Paramétrico de Extintores por Correo
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-emerald-300/80 text-xs sm:text-sm mt-0.5">
                  Outlook se abrirá con el borrador pre-llenado · El archivo PDF se descargará automáticamente
                </DialogPrimitive.Description>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge className="bg-orange-500/20 text-orange-200 border border-orange-400/30 text-xs font-bold tracking-wider px-3 py-1 hidden sm:inline-flex">
                  NOM-002 / 016 / 026
                </Badge>
                <DialogPrimitive.Close className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-stone-300 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            {/* Strip informativo */}
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-emerald-200/80 font-mono">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-400" />
                {meta.projectName || 'Proyecto General'}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-orange-400" />
                {meta.clientName || 'Cliente General'}
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {meta.validCount} de {meta.totalCount} extintores validados
              </span>
            </div>
          </div>

          {/* ══ BODY — 2 Columnas ════════════════════════════════════════════ */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0 bg-slate-950">

            {/* ── COLUMNA IZQUIERDA: Formulario ──────────────────────────── */}
            <div className="lg:w-[420px] xl:w-[460px] shrink-0 flex flex-col border-r border-stone-800 overflow-y-auto">
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1">

                <div className="flex items-start gap-3 p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 leading-relaxed">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    Ingresa el destinatario y haz clic en <strong>Enviar con Outlook</strong>. Se descargará el informe PDF oficial y se abrirá tu cliente de correo.
                  </p>
                </div>

                {/* Para */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-orange-400" />
                    Para <span className="text-red-400 font-normal normal-case">* requerido</span>
                  </Label>
                  <Input
                    id="email-to"
                    type="email"
                    value={to}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
                    placeholder="destinatario@cliente.com"
                    className="h-11 text-sm bg-stone-900 border-stone-700 text-white focus-visible:ring-orange-500"
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCcInput(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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
                      className="h-11 w-11 p-0 border-stone-700 text-stone-300 hover:text-orange-400 hover:border-orange-500 bg-stone-900"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {ccList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ccList.map((email: string) => (
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                    className="h-11 text-sm bg-stone-900 border-stone-700 text-white"
                  />
                </div>

                {/* Archivo Adjunto PDF */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-stone-400" />
                    Adjunto PDF Estandarizado
                  </Label>
                  <div className="flex items-center gap-3 p-4 bg-stone-900 border border-stone-800 rounded-xl">
                    <div className="w-11 h-11 rounded-xl bg-orange-950/80 border border-orange-500/40 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate" title={attachmentName}>
                        {attachmentName}
                      </p>
                      <p className="text-[11px] text-stone-400 mt-0.5">Reporte Oficial GESTION DE RIESGOS Y CONTROL</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPdf}
                      disabled={isDownloadingPdf}
                      className="h-9 px-3 text-xs text-orange-300 border-orange-500/50 bg-stone-900 hover:bg-stone-800 shrink-0 font-semibold"
                    >
                      <Paperclip className="w-3.5 h-3.5 mr-1" />
                      {isDownloadingPdf ? 'Generando...' : 'Descargar'}
                    </Button>
                  </div>
                </div>

              </div>
            </div>

            {/* ── COLUMNA DERECHA: Vista Previa Mockup Outlook ─────────── */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-stone-900/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-400" /> Vista Previa del Correo (Outlook Mockup)
                </span>
                <Badge variant="outline" className="text-[10px] text-orange-300 border-orange-500/40 font-mono">
                  Outlook Draft Mode
                </Badge>
              </div>

              {/* Contenedor Mockup Outlook */}
              <div className="flex-1 overflow-hidden flex flex-col border border-stone-800 rounded-xl shadow-2xl bg-slate-950">
                {/* Barra Azul Outlook */}
                <div className="bg-[#0078d4] px-4 py-2.5 flex items-center justify-between text-white text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>Nuevo Mensaje - Outlook</span>
                  </div>
                  <span className="text-[11px] opacity-80">Low Voltage Estimator Client</span>
                </div>

                {/* Headers Correo */}
                <div className="bg-stone-950 p-3.5 border-b border-stone-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400 w-16 font-semibold">Para:</span>
                    <span className="text-emerald-400 font-mono">{to || 'destinatario@cliente.com'}</span>
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
                </div>

                {/* Cuerpo del Correo Previsualizado */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-900/90 text-stone-200 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                  {previewBody}
                </div>
              </div>

              {/* Alerta de Acción Requerida */}
              <div className="flex items-start gap-3 p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Importante:</strong> Al presionar <strong>Enviar con Outlook</strong>, se descargará la estimación paramétrica en PDF y se abrirá tu borrador en Outlook listo para adjuntar.
                </p>
              </div>
            </div>

          </div>

          {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
          <div className="shrink-0 border-t border-stone-800 bg-slate-950 px-8 py-4 flex items-center justify-between gap-4">
            <p className="text-xs text-stone-400">
              Low Voltage Estimator · Módulo Paramétrico Extintores & Protección Contra Incendio
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
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold gap-2 shadow-lg shadow-emerald-950/50 px-6"
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
