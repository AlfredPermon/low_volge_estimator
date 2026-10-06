'use client';

import { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Mail,
  Paperclip,
  Send,
  X,
  Plus,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Info,
  User,
  Building2,
  Hash,
  MapPin,
  Leaf,
  ShieldCheck,
  Edit3,
  RotateCcw,
  Sparkles,
  Clock,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  exportEnvironmentFormToExcel,
  exportEnvironmentFormToPDF,
  EnvironmentExportData,
} from '@/lib/environment-export';

export type DownloadFormatOption = 'excel' | 'pdf' | 'both';

interface EmailEnvironmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: EnvironmentExportData;
}

function formatCurrencyMXN(val: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val);
}

export function buildDefaultEnvironmentEmailBody(
  data: EnvironmentExportData,
  format: DownloadFormatOption = 'both'
): string {
  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTotal = formatCurrencyMXN(data.totalAmount);
  const disbursementSummaryText = data.disbursementPlan
    ? data.customSummaryText
      ? `--------------------------------------------------
  RESUMEN EJECUTIVO DEL PLAN DE EROGACIONES
--------------------------------------------------
  ${data.customSummaryText}
  * Horizonte del Flujo : ${data.disbursementPlan.rows.length} meses

`
      : `--------------------------------------------------
  RESUMEN EJECUTIVO DEL PLAN DE EROGACIONES
--------------------------------------------------
  * Mes Pico            : ${data.disbursementPlan.summary.peakMonthLabel}
  * Erogación Máxima    : ${formatCurrencyMXN(data.disbursementPlan.summary.peakMonthTotal)}
  * Peso del Mes 1      : ${data.disbursementPlan.summary.firstMonthWeightPct.toFixed(1)}% del total
  * Horizonte del Flujo : ${data.disbursementPlan.rows.length} meses

`
    : '';

  const categoryBreakdownText =
    data.summaryByCategory.length > 0
      ? data.summaryByCategory
          .map((sc) => `  * ${sc.cat.padEnd(30, ' ')} : ${formatCurrencyMXN(sc.v)}`)
          .join('\n')
      : '  * Sin categorías seleccionadas';

  let attachmentNoteText = '';
  if (format === 'excel') {
    attachmentNoteText =
      'Se adjunta la memoria de cálculo en formato Excel (.xlsx) con el desglose detallado de precios unitarios por región, multiplicadores paramétricos y cantidades estimadas.';
  } else if (format === 'pdf') {
    attachmentNoteText =
      'Se adjunta el dictamen paramétrico en formato PDF (.pdf) con el formato oficial SSMA y firmas de responsabilidad ambiental.';
  } else {
    attachmentNoteText =
      'Se adjuntan la memoria de cálculo en formato Excel (.xlsx) y el dictamen paramétrico oficial en formato PDF (.pdf) con el desglose detallado por categoría SSMA.';
  }

  return `Estimado/a equipo de Dirección de Proyecto / SSMA,

Por medio del presente correo, les comparto la Estimación Paramétrica de Seguridad, Salud y Medio Ambiente (SSMA) elaborada para el proyecto indicado a continuación.

--------------------------------------------------
  INFORMACIÓN GENERAL DEL PROYECTO
--------------------------------------------------
  * Nombre del Proyecto : ${data.projectName || 'N/A'}
  * Cliente             : ${data.clientName || 'N/A'}
  * Región de Costos    : ${data.regionName || 'N/A'}
  * Tipo de Obra        : ${data.projectType || 'Construcción'}
  * Etapa de Ejecución  : ${data.stageName || 'Construcción'}
  * Fecha de Emisión    : ${fechaHoy}

--------------------------------------------------
  PARÁMETROS DE DURACIÓN Y RRHH
--------------------------------------------------
  * Duración de Obra    : ${data.durationMonths} meses
  * Cobertura de RRHH   : ${data.humanResMonths} meses (Duración de obra + 2 meses de gestión)
  * Responsable SSMA    : ${data.responsible || 'Coordinador SSMA'}

--------------------------------------------------
  RESUMEN PRESUPUESTAL SSMA
--------------------------------------------------
  * Total Paramétrico   : ${formattedTotal} MXN
  * Partidas Incluidas  : ${data.items.length} partidas paramétricas

--------------------------------------------------
  DESGLOSE POR CATEGORÍA DE IMPACTO
--------------------------------------------------
${categoryBreakdownText}

--------------------------------------------------
${disbursementSummaryText}${attachmentNoteText}

--------------------------------------------------
Vigencia de la estimación: 30 días naturales a partir de su emisión.

Quedo atento a cualquier duda o aclaración técnica sobre los rubros normativos y presupuestales expresados.

Atentamente,

${data.responsible || 'Responsable SSMA'}
Módulo Medio Ambiente · Low-Voltage Estimator
${data.clientName ? `Cliente: ${data.clientName}` : ''}${data.responsibleEmail ? `\n✉ ${data.responsibleEmail}` : ''}
`;
}

function buildSafeMailtoUri(
  to: string,
  subject: string,
  ccList: string[],
  bodyText: string
): string {
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
      '\n\n[...Texto completo disponible en el documento adjunto]';
    encodedBody = encodeURIComponent(safeBody);
  }

  return prefix + encodedBody;
}

export default function EmailEnvironmentDialog({
  open,
  onOpenChange,
  data,
}: EmailEnvironmentDialogProps) {
  const [to, setTo] = useState(data.responsibleEmail || '');
  const [ccList, setCcList] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [subject, setSubject] = useState(
    `Estimación Paramétrica SSMA / Medio Ambiente | ${data.projectName || 'Proyecto'}${data.regionName ? ` | Región ${data.regionName}` : ''}`
  );

  // Selección de formato de adjunto: 'excel', 'pdf', o 'both'
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormatOption>('both');

  // Estado para edición del cuerpo del correo
  const [bodyText, setBodyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDownloadingAttachment, setIsDownloadingAttachment] = useState(false);

  // Inicializar/restablecer cuerpo cuando cambian los datos o se abre el diálogo
  useEffect(() => {
    if (open) {
      const defaultBody = buildDefaultEnvironmentEmailBody(data, downloadFormat);
      setBodyText(defaultBody);
      if (data.responsibleEmail) {
        setTo(data.responsibleEmail);
      }
    }
  }, [open, data, downloadFormat]);

  const cleanProjectName = (data.projectName || 'Proyecto')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');

  const excelAttachmentName = `Estimacion_SSMA_Medio_Ambiente_${cleanProjectName}.xlsx`;
  const pdfAttachmentName = `${cleanProjectName}_Parametrico_Medio_Ambiente.pdf`;

  const handleFormatChange = (fmt: DownloadFormatOption) => {
    setDownloadFormat(fmt);
    const newBody = buildDefaultEnvironmentEmailBody(data, fmt);
    setBodyText(newBody);
  };

  const handleResetBody = () => {
    const defaultBody = buildDefaultEnvironmentEmailBody(data, downloadFormat);
    setBodyText(defaultBody);
    toast.info('Cuerpo del correo restablecido a la plantilla original');
  };

  const addCc = () => {
    const trimmed = ccInput.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('El correo CC no es válido');
      return;
    }
    if (ccList.includes(trimmed)) {
      toast.info('El correo CC ya fue agregado');
      return;
    }
    setCcList((prev) => [...prev, trimmed]);
    setCcInput('');
  };

  const removeCc = (email: string) =>
    setCcList((prev) => prev.filter((e) => e !== email));

  const executeDownloads = async (fmt: DownloadFormatOption) => {
    if (fmt === 'excel') {
      await exportEnvironmentFormToExcel(data);
      toast.success(`Archivo Excel "${excelAttachmentName}" descargado`);
    } else if (fmt === 'pdf') {
      exportEnvironmentFormToPDF(data);
      toast.success(`Archivo PDF "${pdfAttachmentName}" descargado`);
    } else {
      await exportEnvironmentFormToExcel(data);
      exportEnvironmentFormToPDF(data);
      toast.success(`Archivos Excel (${excelAttachmentName}) y PDF (${pdfAttachmentName}) descargados`);
    }
  };

  const handleDownloadAttachment = async () => {
    setIsDownloadingAttachment(true);
    try {
      await executeDownloads(downloadFormat);
    } catch (err) {
      console.error(err);
      toast.error('Error al generar los documentos de Medio Ambiente');
    } finally {
      setIsDownloadingAttachment(false);
    }
  };

  const handleSendOutlook = async () => {
    if (!to.trim()) {
      toast.error('Ingresa al menos un destinatario en el campo "Para:"');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      toast.error('El correo del destinatario no tiene un formato válido');
      return;
    }

    setIsSending(true);
    try {
      // 1. Descargar los documentos según la selección
      await executeDownloads(downloadFormat);

      // 2. Preparar uri mailto con el texto editado o actual del cuerpo
      const mailtoUri = buildSafeMailtoUri(to, subject, ccList, bodyText);

      // 3. Abrir el cliente predeterminado (Outlook)
      const link = document.createElement('a');
      link.href = mailtoUri;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const msg =
        downloadFormat === 'both'
          ? `Outlook abierto. Adjunta el Excel y PDF desde Descargas.`
          : downloadFormat === 'pdf'
          ? `Outlook abierto. Adjunta el archivo PDF desde Descargas.`
          : `Outlook abierto. Adjunta el archivo Excel desde Descargas.`;

      toast.success(msg, { duration: 8000 });
      onOpenChange(false);
    } catch (err) {
      console.error('Error enviando correo de Medio Ambiente:', err);
      toast.error('Error al preparar el correo. Intenta de nuevo.');
    } finally {
      setIsSending(false);
    }
  };

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay Glassmorphism */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content con bypass de ancho Radix */}
        <DialogPrimitive.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(1260px, 96vw)',
            maxHeight: '90vh',
            zIndex: 51,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '1.25rem',
            overflow: 'hidden',
            boxShadow: '0 32px 80px -12px rgba(4, 57, 39, 0.45)',
          }}
          className="bg-white border border-emerald-100 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
        >
          {/* ══ HEADER DECORATIVO VERDE MEDIO AMBIENTE ════════════════════════ */}
          <div className="shrink-0 bg-gradient-to-r from-[#043927] via-[#0e7c66] to-[#043927] px-6 py-4 sm:px-8 sm:py-5 text-white">
            <div className="flex items-center gap-4">
              {/* Ícono Eco */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner backdrop-blur-md">
                <Leaf className="w-6 h-6 text-emerald-300 animate-pulse" />
              </div>

              {/* Título & Subtítulo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogPrimitive.Title className="text-white font-bold text-lg sm:text-xl leading-tight tracking-tight">
                    Enviar Estimación SSMA por Correo
                  </DialogPrimitive.Title>
                  <Badge className="bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-[10px] font-bold uppercase tracking-widest hidden md:inline-flex">
                    Medio Ambiente
                  </Badge>
                </div>
                <DialogPrimitive.Description className="text-emerald-200/90 text-xs sm:text-sm mt-0.5">
                  Genera borrador en Outlook · Selecciona descarga Excel (.xlsx), PDF (.pdf) o Ambos (.xlsx + .pdf)
                </DialogPrimitive.Description>
              </div>

              {/* Badge + Botón cerrar */}
              <div className="flex items-center gap-3 shrink-0">
                <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-semibold px-3 py-1 hidden sm:inline-flex gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  SSMA 2026
                </Badge>
                <DialogPrimitive.Close className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-emerald-100 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            {/* Strip de datos paramétricos */}
            <div className="mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-emerald-100/80 pt-2 border-t border-white/10">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-white">{data.projectName || 'Proyecto'}</span>
              </span>
              {data.clientName && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  {data.clientName}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Región {data.regionName}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {data.durationMonths}m obra / {data.humanResMonths}m RRHH
              </span>
              <span className="flex items-center gap-1.5 font-bold text-emerald-300 ml-auto">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                {formatCurrencyMXN(data.totalAmount)} MXN
              </span>
            </div>
          </div>

          {/* ══ BODY — 2 COLUMNAS ════════════════════════════════════════════ */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

            {/* ── COLUMNA IZQUIERDA: Formulario + Selección de Formato ──────── */}
            <div className="lg:w-[500px] xl:w-[540px] shrink-0 flex flex-col border-r border-stone-100 overflow-y-auto bg-stone-50/40">
              <div className="p-5 sm:p-6 space-y-5 flex-1">

                {/* Banner Informativo */}
                <div className="flex items-start gap-3 p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 leading-relaxed">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    Selecciona los formatos de reporte deseados (<b>Excel</b>, <b>PDF</b> o <b>Ambos</b>) y edita el cuerpo del correo. Al presionar <strong>Enviar con Outlook</strong>, se descargarán los archivos seleccionados.
                  </p>
                </div>

                {/* ══ SELECCIÓN DE FORMATO ADJUNTO (NUEVO REQUERIMIENTO) ════════ */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                      Selección de adjunto(s)
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-800 border-emerald-300 bg-emerald-50 font-semibold">
                      Formatos Disponibles
                    </Badge>
                  </Label>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFormatChange('excel')}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs transition-all",
                        downloadFormat === 'excel'
                          ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-600"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      )}
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Excel (.xlsx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFormatChange('pdf')}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs transition-all",
                        downloadFormat === 'pdf'
                          ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-600"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      )}
                    >
                      <FileText className="w-4 h-4 text-red-600" />
                      <span>PDF (.pdf)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFormatChange('both')}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs transition-all relative",
                        downloadFormat === 'both'
                          ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-600"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] text-stone-400">+</span>
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                      </div>
                      <span className="text-[11px]">Ambos (Recomendado)</span>
                    </button>
                  </div>
                </div>

                {/* Campo PARA */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Para <span className="text-red-500 font-normal normal-case">* requerido</span>
                  </Label>
                  <Input
                    id="email-to-env"
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="coordinador.ssma@empresa.com"
                    className="h-10 text-sm border-stone-200 focus-visible:ring-emerald-600 bg-white"
                  />
                </div>

                {/* Campo CC con Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    CC <span className="text-stone-400 font-normal normal-case">(Copia opcional)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="email-cc-env"
                      type="email"
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addCc();
                        }
                      }}
                      placeholder="gerente@empresa.com → Presiona Enter"
                      className="h-10 text-sm flex-1 border-stone-200 bg-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCc}
                      className="h-10 w-10 p-0 border-stone-200 text-stone-600 hover:text-emerald-700 hover:border-emerald-500 bg-white"
                      title="Agregar correo CC"
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
                          className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 gap-1.5 pr-1.5 h-6"
                        >
                          {email}
                          <button
                            onClick={() => removeCc(email)}
                            className="hover:text-red-500 transition-colors"
                            title="Quitar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Campo ASUNTO */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-stone-400" />
                    Asunto del correo
                  </Label>
                  <Input
                    id="email-subject-env"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-10 text-sm border-stone-200 bg-white focus-visible:ring-emerald-600"
                  />
                </div>

                {/* ══ EDICIÓN DE CUERPO DE CORREO ═════════════════════════════ */}
                <div className="space-y-2 pt-1 border-t border-stone-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                      Cuerpo del correo
                      <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-200 bg-emerald-50 font-normal">
                        Tropicalizado SSMA
                      </Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetBody}
                        className="h-7 text-[11px] text-stone-500 hover:text-emerald-700 gap-1 px-2"
                        title="Restablecer a la plantilla oficial de Medio Ambiente"
                      >
                        <RotateCcw className="w-3 h-3" /> Restablecer
                      </Button>
                    </div>
                  </div>

                  <div className="relative rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                    <Textarea
                      id="email-body-editor"
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      rows={9}
                      className="w-full text-xs font-mono border-0 focus-visible:ring-0 p-3.5 resize-y min-h-[160px] max-h-[300px] text-stone-800 leading-relaxed"
                      placeholder="Escribe o modifica el contenido del correo..."
                    />
                    <div className="bg-stone-50 border-t border-stone-100 px-3 py-1.5 flex items-center justify-between text-[11px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        Edición en tiempo real activada
                      </span>
                      <span>{bodyText.length} caracteres · {bodyText.split('\n').length} líneas</span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta de descarga de archivos según selección */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-stone-400" />
                    Archivos listos para descargar y adjuntar
                  </Label>

                  <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(downloadFormat === 'excel' || downloadFormat === 'both') && (
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                          <FileSpreadsheet className="w-4.5 h-4.5" />
                        </div>
                      )}
                      {(downloadFormat === 'pdf' || downloadFormat === 'both') && (
                        <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-sm">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-800 truncate">
                        {downloadFormat === 'both'
                          ? `Excel (.xlsx) + PDF (.pdf)`
                          : downloadFormat === 'pdf'
                          ? pdfAttachmentName
                          : excelAttachmentName}
                      </p>
                      <p className="text-[11px] text-emerald-700/80 mt-0.5 font-medium truncate">
                        {downloadFormat === 'both'
                          ? 'Memoria de cálculo + Dictamen paramétrico oficial SSMA'
                          : downloadFormat === 'pdf'
                          ? 'Dictamen paramétrico oficial SSMA (PDF)'
                          : 'Memoria de cálculo SSMA (Excel)'}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadAttachment}
                      disabled={isDownloadingAttachment}
                      className="h-8 px-3 text-xs text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-50 shrink-0 font-semibold"
                    >
                      <Paperclip className="w-3.5 h-3.5 mr-1" />
                      {isDownloadingAttachment ? 'Generando...' : 'Descargar'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── COLUMNA DERECHA: Vista Previa Outlook Simulada ──────────── */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">
              {/* Cabecera de Columna */}
              <div className="shrink-0 px-6 py-3.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Vista Previa del Correo en Outlook
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] text-stone-500 border-stone-200">
                  Microsoft 365 Outlook
                </Badge>
              </div>

              {/* Contenido Mockup Outlook */}
              <div className="flex-1 overflow-hidden p-6 flex flex-col gap-3">

                {/* Toolbar simulado de Outlook */}
                <div className="shrink-0 flex items-center gap-3 bg-[#0078d4] rounded-t-xl px-4 py-2.5 text-white shadow-sm">
                  <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                    <Send className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex gap-1.5 text-[11px] font-medium">
                    <span className="bg-white/20 px-2.5 py-0.5 rounded text-white font-semibold">Enviar</span>
                    <span className="hover:bg-white/10 px-2 py-0.5 rounded cursor-pointer">Adjuntar</span>
                    <span className="hover:bg-white/10 px-2 py-0.5 rounded cursor-pointer">Firma</span>
                    <span className="hover:bg-white/10 px-2 py-0.5 rounded cursor-pointer">Opciones</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                  </div>
                </div>

                {/* Cabecera del Mail simulado */}
                <div className="shrink-0 bg-stone-50 border border-stone-200 border-t-0 px-5 py-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-stone-400 w-14 font-medium shrink-0">Para:</span>
                    <span className="text-stone-900 font-semibold truncate">{to || 'coordinador.ssma@empresa.com'}</span>
                  </div>
                  {ccList.length > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-stone-400 w-14 font-medium shrink-0">CC:</span>
                      <span className="text-stone-700 truncate">{ccList.join('; ')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-stone-400 w-14 font-medium shrink-0">Asunto:</span>
                    <span className="text-stone-900 font-semibold truncate flex-1">{subject}</span>
                  </div>
                  <div className="flex items-center gap-3 pt-1 border-t border-stone-200">
                    <span className="text-stone-400 w-14 font-medium shrink-0">Adjunto:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(downloadFormat === 'excel' || downloadFormat === 'both') && (
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-0.5 text-emerald-800">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-medium truncate max-w-[220px]">{excelAttachmentName}</span>
                        </div>
                      )}
                      {(downloadFormat === 'pdf' || downloadFormat === 'both') && (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded px-2.5 py-0.5 text-red-800">
                          <FileText className="w-3.5 h-3.5 text-red-600" />
                          <span className="text-[10px] font-medium truncate max-w-[220px]">{pdfAttachmentName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cuerpo del correo en directo */}
                <div className="flex-1 overflow-y-auto border border-stone-200 border-t-0 rounded-b-xl bg-white p-5">
                  <pre className="text-[12px] text-stone-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {bodyText}
                  </pre>
                </div>

                {/* Aviso de adjuntar archivo */}
                <div className="shrink-0 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Paso final:</strong> Al abrir Outlook, adjunta{' '}
                    {downloadFormat === 'both' ? (
                      <span>los archivos <strong>{excelAttachmentName}</strong> y <strong>{pdfAttachmentName}</strong></span>
                    ) : downloadFormat === 'pdf' ? (
                      <span>el archivo <strong>{pdfAttachmentName}</strong></span>
                    ) : (
                      <span>el archivo <strong>{excelAttachmentName}</strong></span>
                    )}{' '}
                    desde tu carpeta de <strong>Descargas</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ══ FOOTER DE ACCIÓN ═════════════════════════════════════════════ */}
          <div className="shrink-0 border-t border-stone-200 bg-stone-50 px-8 py-4 flex items-center justify-between gap-4">
            <p className="text-xs text-stone-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {downloadFormat === 'both'
                ? 'Los archivos Excel y PDF se descargarán automáticamente'
                : downloadFormat === 'pdf'
                ? 'El archivo PDF se descargará automáticamente'
                : 'El archivo Excel se descargará automáticamente'}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-10 px-5 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendOutlook}
                disabled={isSending}
                className="h-10 px-7 gap-2 bg-[#0e7c66] hover:bg-[#0a6352] text-white font-bold shadow-md shadow-emerald-900/20 text-sm"
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
