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
  FileSpreadsheet,
  AlertCircle,
  Info,
  User,
  Building2,
  Hash,
  Calendar,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportVivotekFormToExcel, VivotekFormData } from '@/lib/vivotek-export';

interface EmailVivotekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: VivotekFormData;
}

function buildEmailBody(data: VivotekFormData): string {
  const fecha = data.fechaRegistro
    ? new Date(data.fechaRegistro + 'T12:00:00').toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  return `Estimado/a equipo VIVOTEK / TVC,

Por medio del presente correo, me permito compartirles el Registro de Proyecto correspondiente a la oportunidad indicada a continuación, conforme al proceso oficial de registro de proyectos VIVOTEK.

───────────────────────────────────────────────────
  INFORMACIÓN DEL REGISTRO
───────────────────────────────────────────────────
  • Número de Registro  : ${data.numRegistro || 'N/A'}
  • Nombre del Proyecto : ${data.nombreProyecto || 'N/A'}
  • Fecha de Registro   : ${fecha}
  • Usuario Final       : ${data.empresaUsuarioFinal || 'N/A'}
  • Lugar del Proyecto  : ${data.lugarProyecto || 'N/A'}
───────────────────────────────────────────────────
  DATOS DEL INTEGRADOR
───────────────────────────────────────────────────
  • Empresa Integradora : ${data.nombreEmpresaIntegrador || 'N/A'}
  • Persona que Registra: ${data.personaRegistraIntegrador || 'N/A'}
  • E-mail Integrador   : ${data.emailIntegrador || 'N/A'}
  • Responsable Ing.    : ${data.responsableIngenieria || 'N/A'}
───────────────────────────────────────────────────
  DATOS DEL MAYORISTA
───────────────────────────────────────────────────
  • Mayorista           : ${data.nombreMayorista || 'TVC Línea Comercial'}
  • Persona de Contacto : ${data.personaRegistraMayorista || 'N/A'}
  • E-mail Mayorista    : ${data.emailMayorista || 'N/A'}
───────────────────────────────────────────────────

Se adjunta el archivo de Registro de Proyecto en formato Excel (.xlsx) con el detalle completo de los equipos VIVOTEK solicitados, incluyendo modelos, cantidades, precios y extensiones de garantía aplicables.

Este registro tiene una vigencia de 30 días naturales, sujeto a seguimiento periódico por parte del Integrador conforme a las políticas de registro de proyectos VIVOTEK.

En caso de requerir información adicional o aclaraciones, quedamos a su disposición.

Atentamente,

${data.personaRegistraIntegrador || 'Ejecutivo de Ventas'}
${data.nombreEmpresaIntegrador || ''}${data.emailIntegrador ? `\n✉ ${data.emailIntegrador}` : ''}

───────────────────────────────────────────────────
Este correo es generado por el Sistema de Registro VIVOTEK / TVC.
Registro N°: ${data.numRegistro || 'N/A'}
`;
}

export default function EmailVivotekDialog({
  open,
  onOpenChange,
  formData,
}: EmailVivotekDialogProps) {
  const [to, setTo] = useState('');
  const [ccList, setCcList] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [subject, setSubject] = useState(
    `Registro de Proyecto - VIVOTEK${formData.numRegistro ? ` | ${formData.numRegistro}` : ''}${formData.nombreProyecto ? ` | ${formData.nombreProyecto}` : ''}`
  );
  const [isSending, setIsSending] = useState(false);
  const [isDownloadingAttachment, setIsDownloadingAttachment] = useState(false);

  const cleanProjectName = (formData.nombreProyecto || 'Proyecto')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const cleanFolio = (formData.numRegistro || 'REG-VIV-000000').replace(/[^a-zA-Z0-9_-]/g, '_');
  const attachmentName = `Registro_VIVOTEK_TVC_${cleanProjectName}_${cleanFolio}.xlsx`;

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

  const removeCc = (email: string) =>
    setCcList((prev) => prev.filter((e) => e !== email));

  const handleDownloadAttachment = async () => {
    setIsDownloadingAttachment(true);
    try {
      await exportVivotekFormToExcel(formData);
      toast.success(`Archivo "${attachmentName}" descargado`);
    } catch {
      toast.error('Error al generar el archivo Excel');
    } finally {
      setIsDownloadingAttachment(false);
    }
  };

  const handleSendOutlook = async () => {
    if (!to.trim()) { toast.error('Ingresa al menos un destinatario (Para:)'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      toast.error('El correo del destinatario no es válido'); return;
    }
    setIsSending(true);
    try {
      await exportVivotekFormToExcel(formData);
      const body = buildEmailBody(formData);
      const ccParam = ccList.length > 0 ? `&cc=${encodeURIComponent(ccList.join(';'))}` : '';
      const mailtoUri = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}${ccParam}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUri;
      toast.success(`Outlook abierto. Adjunta el archivo "${attachmentName}" desde Descargas.`, { duration: 8000 });
      onOpenChange(false);
    } catch {
      toast.error('Error al preparar el correo. Intenta de nuevo.');
    } finally {
      setIsSending(false);
    }
  };

  const previewBody = buildEmailBody(formData);

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content — anchura forzada vía style inline para evitar sm:max-w-lg del base */}
        <DialogPrimitive.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(1280px, 96vw)',
            maxHeight: '92vh',
            zIndex: 51,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '1rem',
            overflow: 'hidden',
            boxShadow: '0 32px 80px -12px rgba(0,0,0,0.45)',
          }}
          className="bg-white border border-stone-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
        >
          {/* ══ HEADER ══════════════════════════════════════════════════════ */}
          <div className="shrink-0 bg-gradient-to-r from-[#0a2e1a] via-[#0d3d22] to-[#0a2e1a] px-8 py-5">
            <div className="flex items-center gap-4">
              {/* Ícono */}
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Mail className="w-6 h-6 text-emerald-300" />
              </div>

              {/* Títulos */}
              <div className="flex-1 min-w-0">
                <DialogPrimitive.Title className="text-white font-bold text-xl leading-tight tracking-tight">
                  Enviar Registro de Proyecto por Correo
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-emerald-300/80 text-sm mt-0.5">
                  Outlook se abrirá con el borrador pre-llenado · El archivo Excel se descargará automáticamente
                </DialogPrimitive.Description>
              </div>

              {/* Badge + Close */}
              <div className="flex items-center gap-3 shrink-0">
                <Badge className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-bold tracking-wider px-3 py-1">
                  VIVOTEK / TVC 2026
                </Badge>
                <DialogPrimitive.Close className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-stone-300 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            {/* Registro info strip */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[11px] text-emerald-200/70">
              {formData.numRegistro && (
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-emerald-400" />
                  <span className="font-mono font-semibold text-emerald-300">{formData.numRegistro}</span>
                </span>
              )}
              {formData.nombreProyecto && (
                <span className="flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3 text-emerald-500" />
                  {formData.nombreProyecto}
                </span>
              )}
              {formData.empresaUsuarioFinal && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 text-emerald-500" />
                  {formData.empresaUsuarioFinal}
                </span>
              )}
              {formData.lugarProyecto && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  {formData.lugarProyecto}
                </span>
              )}
              {formData.fechaRegistro && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-emerald-500" />
                  {formData.fechaRegistro}
                </span>
              )}
            </div>
          </div>

          {/* ══ BODY — 2 columnas ════════════════════════════════════════════ */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

            {/* ── COLUMNA IZQUIERDA: Formulario ──────────────────────────── */}
            <div className="lg:w-[480px] shrink-0 flex flex-col border-r border-stone-100 overflow-y-auto">
              <div className="p-7 space-y-5 flex-1">

                {/* Banner info */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 leading-relaxed">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p>
                    Completa los datos de envío y haz clic en{' '}
                    <strong>Enviar con Outlook</strong>. El archivo Excel se descargará
                    automáticamente para que lo adjuntes en Outlook.
                  </p>
                </div>

                {/* Para */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    Para <span className="text-red-500 font-normal normal-case tracking-normal">* requerido</span>
                  </Label>
                  <Input
                    id="email-to"
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="destinatario@empresa.com"
                    className="h-11 text-sm border-stone-200 focus-visible:ring-emerald-500"
                  />
                </div>

                {/* CC */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    CC <span className="text-stone-400 font-normal normal-case tracking-normal">(opcional)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="email-cc"
                      type="email"
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCc(); }
                      }}
                      placeholder="correo@ejemplo.com → presiona Enter"
                      className="h-11 text-sm flex-1 border-stone-200"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCc}
                      className="h-11 w-11 p-0 border-stone-200 text-stone-500 hover:text-emerald-700 hover:border-emerald-400"
                      title="Agregar CC"
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
                          className="text-xs bg-stone-100 text-stone-700 border border-stone-200 gap-1.5 pr-1.5 h-6"
                        >
                          {email}
                          <button onClick={() => removeCc(email)} className="hover:text-red-500 transition-colors" title="Quitar">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Asunto */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-stone-400" />
                    Asunto
                  </Label>
                  <Input
                    id="email-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-11 text-sm border-stone-200"
                  />
                </div>

                {/* Archivo adjunto */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-stone-400" />
                    Archivo adjunto
                  </Label>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 shadow-sm">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate" title={attachmentName}>
                        {attachmentName}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">Registro VIVOTEK — Microsoft Excel (.xlsx)</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadAttachment}
                      disabled={isDownloadingAttachment}
                      className="h-9 px-4 text-xs text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-50 shrink-0 font-semibold"
                    >
                      <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                      {isDownloadingAttachment ? 'Generando...' : 'Descargar'}
                    </Button>
                  </div>
                </div>

                {/* Datos clave del registro */}
                <div className="rounded-xl border border-stone-200 overflow-hidden">
                  <div className="bg-stone-700 px-4 py-2.5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <p className="text-[11px] font-bold text-stone-200 uppercase tracking-wider">
                      Datos clave del registro
                    </p>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {[
                      { icon: Hash, label: 'Folio', value: formData.numRegistro, mono: true },
                      { icon: Building2, label: 'Proyecto', value: formData.nombreProyecto },
                      { icon: User, label: 'Usuario Final', value: formData.empresaUsuarioFinal },
                      { icon: MapPin, label: 'Lugar', value: formData.lugarProyecto },
                      { icon: Calendar, label: 'Fecha', value: formData.fechaRegistro },
                    ].map(({ icon: Icon, label, value, mono }) => (
                      <div key={label} className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs text-stone-500 w-24 shrink-0">{label}</span>
                        <span className={`text-xs text-stone-800 truncate flex-1 ${mono ? 'font-mono font-semibold text-emerald-700' : ''}`}>
                          {value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── COLUMNA DERECHA: Vista previa ─────────────────────────── */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              {/* Cabecera de columna */}
              <div className="shrink-0 px-7 pt-6 pb-3 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-stone-400" />
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                    Vista previa del correo
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] text-stone-500 border-stone-200">
                  Outlook / Mail Client
                </Badge>
              </div>

              {/* Mockup de correo */}
              <div className="flex-1 overflow-hidden px-7 py-4 flex flex-col gap-3">

                {/* Barra de herramientas simulada de Outlook */}
                <div className="shrink-0 flex items-center gap-3 bg-[#0078d4] rounded-t-xl px-4 py-2.5">
                  <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                    <Send className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex gap-1.5">
                    {['Enviar', 'Adjuntar', 'Insertar'].map((btn) => (
                      <span key={btn} className="text-[10px] text-white/80 bg-white/10 px-2 py-0.5 rounded font-medium">
                        {btn}
                      </span>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-white/30" />
                    <div className="w-2 h-2 rounded-full bg-white/30" />
                    <div className="w-2 h-2 rounded-full bg-white/30" />
                  </div>
                </div>

                {/* Cabecera del correo simulada */}
                <div className="shrink-0 bg-stone-50 border border-stone-200 border-t-0 rounded-none px-5 py-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-stone-400 w-14 font-medium">Para:</span>
                    <span className="text-stone-800 font-semibold">{to || 'destinatario@empresa.com'}</span>
                  </div>
                  {ccList.length > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-stone-400 w-14 font-medium">CC:</span>
                      <span className="text-stone-700">{ccList.join('; ')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-stone-400 w-14 font-medium">Asunto:</span>
                    <span className="text-stone-800 font-semibold truncate flex-1">{subject}</span>
                  </div>
                  <div className="flex items-center gap-3 pt-1 border-t border-stone-200">
                    <span className="text-stone-400 w-14 font-medium">Adjunto:</span>
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                      <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 text-[10px] font-medium truncate max-w-[300px]">{attachmentName}</span>
                    </div>
                  </div>
                </div>

                {/* Cuerpo del correo */}
                <div className="flex-1 overflow-y-auto border border-stone-200 border-t-0 rounded-b-xl bg-white">
                  <div className="p-5">
                    <pre className="text-[12px] text-stone-700 whitespace-pre-wrap font-mono leading-relaxed">
                      {previewBody}
                    </pre>
                  </div>
                </div>

                {/* Aviso adjunto */}
                <div className="shrink-0 flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p>
                    <strong>Acción requerida:</strong> Cuando Outlook abra el borrador,
                    adjunta el archivo <strong className="font-mono">{attachmentName}</strong>{' '}
                    desde tu carpeta de <strong>Descargas</strong> antes de enviar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
          <div className="shrink-0 border-t border-stone-200 bg-stone-50 px-8 py-4 flex items-center justify-between gap-4">
            <p className="text-[11px] text-stone-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-stone-300" />
              El archivo Excel se descargará automáticamente al presionar Enviar
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
                className="h-10 px-7 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-900/20 text-sm"
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
