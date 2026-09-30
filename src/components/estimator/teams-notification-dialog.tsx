'use client';

import { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Send,
  X,
  AlertCircle,
  Info,
  User,
  Building2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Mail,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNotificationStore } from '@/store/notification-store';

const TEAMS_WEBHOOK_STORAGE_KEY = 'lve.teamsWebhookUrl';

export interface TeamsNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  clientName: string;
  parametricDeliveryDate: string;
  techResponsable: string;
  techResponsableEmail: string;
  envResponsable: string;
  envResponsableEmail: string;
  riskResponsable: string;
  riskResponsableEmail: string;
  projectManager: string;
  projectManagerEmail: string;
  notes?: string;
}

export default function TeamsNotificationDialog({
  open,
  onOpenChange,
  projectName,
  clientName,
  parametricDeliveryDate,
  techResponsable,
  techResponsableEmail,
  envResponsable,
  envResponsableEmail,
  riskResponsable,
  riskResponsableEmail,
  projectManager,
  projectManagerEmail,
  notes = '',
}: TeamsNotificationDialogProps) {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [customNotes, setCustomNotes] = useState(notes);
  const [isSending, setIsSending] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Cargar Webhook URL guardado previamente en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem(TEAMS_WEBHOOK_STORAGE_KEY);
      if (savedUrl) {
        setWebhookUrl(savedUrl);
      }
    }
  }, []);

  const handleWebhookChange = (val: string) => {
    setWebhookUrl(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TEAMS_WEBHOOK_STORAGE_KEY, val);
    }
  };

  // Destinatarios seleccionados
  const [selectedDept, setSelectedDept] = useState<{ [key: string]: boolean }>({
    tech: true,
    env: true,
    risk: true,
    pm: true,
  });

  const formattedDate = parametricDeliveryDate
    ? new Date(
        parametricDeliveryDate + (parametricDeliveryDate.includes('T') ? '' : 'T12:00:00')
      ).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'No definida';

  const departmentList = [
    {
      id: 'tech',
      dept: 'Tecnologías de Seguridad',
      name: techResponsable || 'Sin asignar',
      email: techResponsableEmail,
    },
    {
      id: 'env',
      dept: 'Medio Ambiente',
      name: envResponsable || 'Sin asignar',
      email: envResponsableEmail,
    },
    {
      id: 'risk',
      dept: 'Control de Riesgos',
      name: riskResponsable || 'Sin asignar',
      email: riskResponsableEmail,
    },
    {
      id: 'pm',
      dept: 'Project Manager',
      name: projectManager || 'Sin asignar',
      email: projectManagerEmail,
    },
  ];

  const activeRecipients = departmentList.filter((d) => selectedDept[d.id]);

  const toggleDept = (id: string) => {
    setSelectedDept((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isWebUrlDetected =
    webhookUrl.includes('teams.cloud.microsoft') ||
    webhookUrl.includes('teams.microsoft.com') ||
    webhookUrl.includes('teams.live.com');

  const handleSendWebhook = async () => {
    const cleanUrl = webhookUrl.trim();

    // Si el usuario ingresó la URL web de Teams (ej. https://teams.cloud.microsoft/)
    if (isWebUrlDetected || cleanUrl.includes('teams.cloud.microsoft')) {
      toast.info(
        'Detectamos el enlace web de la app Microsoft Teams. Te redirigiremos a Teams con el mensaje preparado.',
        { duration: 6000 }
      );
      handleOpenTeamsDeepLink();
      return;
    }

    if (!cleanUrl) {
      toast.error('Ingresa una URL de Webhook de Teams o haz clic en "Abrir Chat Teams"', {
        description:
          'Las URLs de Webhook inician con https://outlook.office.com/webhook/ o https://prod-xx.westus.logic.azure.com/...',
        action: {
          label: 'Abrir Chat Teams',
          onClick: () => handleOpenTeamsDeepLink(),
        },
        duration: 8000,
      });
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/notifications/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: cleanUrl,
          projectName,
          clientName,
          parametricDeliveryDate,
          responsibles: activeRecipients.map((r) => ({
            department: r.dept,
            name: r.name,
            email: r.email,
          })),
          notes: customNotes,
        }),
      });

      const data = await res.json();

      if (data.isTeamsWebLink) {
        toast.info(
          'Enlace web de Teams detectado. Abriendo la aplicación Microsoft Teams...',
          { duration: 5000 }
        );
        handleOpenTeamsDeepLink();
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Error al conectar con Microsoft Teams');
      }

      // Guardar URL válida para futuros envíos
      if (typeof window !== 'undefined') {
        localStorage.setItem(TEAMS_WEBHOOK_STORAGE_KEY, cleanUrl);
      }

      // Agregar evento al centro de notificaciones
      addNotification({
        title: 'Notificación enviada a Teams',
        message: `Notificación de Fecha Entrega Paramétricos (${formattedDate}) entregada en canal de Microsoft Teams.`,
        type: 'teams',
        projectName: projectName || 'Sin nombre',
        parametricDeliveryDate,
      });

      toast.success(
        data.message || 'Notificación enviada con éxito al canal de Microsoft Teams',
        { duration: 6000 }
      );

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar la notificación a Teams', {
        duration: 7000,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenTeamsDeepLink = () => {
    const emails = activeRecipients
      .map((r) => r.email)
      .filter((e) => e && e.trim().length > 0)
      .join(';');

    const text = `📌 **Notificación de Proyecto**: ${projectName || 'Sin nombre'}\n📅 **Fecha de Entrega Paramétricos**: ${formattedDate}\n👤 **Cliente**: ${clientName || 'N/A'}${customNotes ? `\n💬 **Observaciones**: ${customNotes}` : ''}`;
    const encodedText = encodeURIComponent(text);

    // Enlace de protocolo nativo msteams o web fallback
    const targetUrl = webhookUrl.includes('teams.cloud.microsoft')
      ? webhookUrl
      : emails.length > 0
        ? `msteams:/l/chat/0/0?users=${encodeURIComponent(emails)}&message=${encodedText}`
        : `https://teams.cloud.microsoft/`;

    window.open(targetUrl, '_blank');

    addNotification({
      title: 'Teams Abierto para Notificación',
      message: `Aplicación Microsoft Teams abierta con el resumen del proyecto preparado.`,
      type: 'teams',
      projectName: projectName || 'Sin nombre',
      parametricDeliveryDate,
    });

    toast.info('Abriendo Microsoft Teams...', { duration: 4000 });
    onOpenChange(false);
  };

  const handleSendEmailToChannel = () => {
    const emails = activeRecipients
      .map((r) => r.email)
      .filter((e) => e && e.trim().length > 0);

    const mailSubject = `[Teams Alerta] Entrega Paramétricos: ${projectName || 'Proyecto'}`;
    const mailBody = `Estimado Equipo / Responsables por Departamento,\n\nSe registra la Fecha de Entrega Paramétricos para el proyecto indicado:\n\n* Proyecto: ${projectName || 'Sin nombre'}\n* Cliente: ${clientName || 'N/A'}\n* Fecha Entrega Paramétricos: ${formattedDate}\n\nResponsables:\n${activeRecipients.map((r) => `- ${r.dept}: ${r.name} (${r.email || 'Sin correo'})`).join('\n')}\n\n${customNotes ? `Observaciones: ${customNotes}\n\n` : ''}Atentamente,\nLow-Voltage Estimator`;

    const mailtoUri = `mailto:${encodeURIComponent(emails.join(';'))}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

    window.location.href = mailtoUri;

    toast.success('Borrador de correo abierto para enviar a los Responsables por Departamento / Canal Teams.');
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content */}
        <DialogPrimitive.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(1200px, 94vw)',
            maxHeight: '90vh',
            zIndex: 51,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '1rem',
            overflow: 'hidden',
            boxShadow: '0 32px 80px -12px rgba(0,0,0,0.5)',
          }}
          className="bg-white border border-stone-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200"
        >
          {/* ══ HEADER ══════════════════════════════════════════════════════ */}
          <div className="shrink-0 bg-gradient-to-r from-[#464EB8] via-[#5B5FC7] to-[#3B3E99] px-6 py-5">
            <div className="flex items-center gap-4">
              {/* Ícono de Teams */}
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>

              {/* Títulos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogPrimitive.Title className="text-white font-bold text-xl leading-tight tracking-tight">
                    Notificación por Microsoft Teams
                  </DialogPrimitive.Title>
                  <Badge className="bg-white/20 text-white border-white/30 text-xs font-semibold px-2.5 py-0.5">
                    Canal / Chat
                  </Badge>
                </div>
                <DialogPrimitive.Description className="text-indigo-100/90 text-xs sm:text-sm mt-0.5">
                  Enviar alerta de Fecha de Entrega Paramétricos a los Responsables por Departamento
                </DialogPrimitive.Description>
              </div>

              {/* Close */}
              <div className="flex items-center gap-3 shrink-0">
                <DialogPrimitive.Close className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-all">
                  <X className="w-4 h-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            {/* Context strip */}
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-indigo-100/80">
              <span className="flex items-center gap-1.5 font-medium text-white">
                <Building2 className="w-3.5 h-3.5 text-indigo-300" />
                {projectName || 'Proyecto sin nombre'}
              </span>
              {clientName && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-300" />
                  Cliente: {clientName}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-white/15 px-2.5 py-0.5 rounded-full font-semibold text-white">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                Entrega Paramétricos: {formattedDate}
              </span>
            </div>
          </div>

          {/* ══ BODY — 2 columnas ════════════════════════════════════════════ */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
            {/* ── COLUMNA IZQUIERDA: Configuración ──────────────────────── */}
            <div className="lg:w-[480px] xl:w-[500px] shrink-0 flex flex-col border-r border-stone-100 overflow-y-auto bg-stone-50/50">
              <div className="p-6 space-y-5 flex-1">
                {/* Banner explicativo */}
                <div className="flex items-start gap-3 p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-xl text-xs text-indigo-900 leading-relaxed">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Opciones de notificación a Teams:</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li><strong>Webhook de Canal (API)</strong>: Para publicación automática en un canal.</li>
                      <li><strong>Abrir Chat Teams</strong>: Abre la app o web Teams con el resumen directo.</li>
                      <li><strong>Enviar por Correo (@teams.ms)</strong>: Para canales con dirección de email.</li>
                    </ul>
                  </div>
                </div>

                {/* Webhook URL de Teams */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#464EB8]" />
                      URL de Webhook o Enlace Teams
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowHelp(!showHelp)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      ¿Cómo obtenerla?
                    </button>
                  </div>

                  <Input
                    value={webhookUrl}
                    onChange={(e) => handleWebhookChange(e.target.value)}
                    placeholder="https://prod-xx.logic.azure.com/... o https://...webhook.office.com/..."
                    className="h-10 text-xs border-stone-200 font-mono focus-visible:ring-indigo-500"
                  />

                  {isWebUrlDetected && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-800">
                      <Info className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>
                        Enlace web de Teams detectado (<strong className="font-mono">teams.cloud.microsoft</strong>). Al hacer clic en <strong>Enviar a Teams</strong> se abrirá la app con la alerta preparada.
                      </span>
                    </div>
                  )}

                  {showHelp && (
                    <div className="p-3 bg-stone-100 border border-stone-200 rounded-lg text-[11px] text-stone-700 space-y-1.5">
                      <p className="font-bold text-stone-800">📌 ¿Cómo crear una URL de Webhook en Teams?</p>
                      <p>1. En Teams, haz clic secundario en el canal que desees notificar y selecciona <strong>Workflows</strong> o <strong>Conectores</strong>.</p>
                      <p>2. Elige <strong>"Post to channel when a webhook request is received"</strong> (o Incoming Webhook).</p>
                      <p>3. Copia la URL generada y pégala arriba.</p>
                    </div>
                  )}
                </div>

                {/* Destinatarios */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#464EB8]" />
                      Responsables por Departamento
                    </span>
                    <span className="text-[11px] font-normal text-stone-500">
                      {activeRecipients.length} de {departmentList.length} incluidos
                    </span>
                  </Label>

                  <div className="space-y-2 bg-white p-3.5 rounded-xl border border-stone-200">
                    {departmentList.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                          selectedDept[item.id]
                            ? 'bg-indigo-50/40 border-indigo-200'
                            : 'bg-stone-50/50 border-stone-100 opacity-60'
                        }`}
                      >
                        <Checkbox
                          id={`dept-${item.id}`}
                          checked={selectedDept[item.id]}
                          onCheckedChange={() => toggleDept(item.id)}
                          className="mt-1 data-[state=checked]:bg-[#464EB8] data-[state=checked]:border-[#464EB8]"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`dept-${item.id}`}
                            className="text-xs font-bold text-stone-800 cursor-pointer block truncate"
                          >
                            {item.dept}
                          </label>
                          <p className="text-xs text-stone-600 truncate mt-0.5">
                            👤 {item.name}
                          </p>
                          <p className="text-[11px] text-stone-500 font-mono truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-stone-400" />
                            {item.email ? (
                              <span className="text-indigo-700 font-semibold">{item.email}</span>
                            ) : (
                              <span className="text-amber-600 italic">
                                Sin correo (Agregar en Configuración)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observaciones */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Observaciones o instrucciones adicionales
                  </Label>
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Escribe comentarios o notas especiales para el equipo..."
                    rows={2}
                    className="w-full text-xs rounded-lg border border-stone-200 p-3 text-stone-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* ── COLUMNA DERECHA: Vista Previa Adaptive Card ─────────────── */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-stone-100/70 p-6">
              <div className="shrink-0 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#464EB8]" />
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Vista Previa en Microsoft Teams (Adaptive Card)
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] bg-white border-stone-200 text-stone-600">
                  AdaptiveCard v1.4 / MessageCard
                </Badge>
              </div>

              {/* Chat Container Mockup */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Chat Message Bubble */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#464EB8] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow">
                    LV
                  </div>
                  <div className="flex-1 max-w-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-stone-800">
                        Low-Voltage Estimator Bot
                      </span>
                      <span className="text-[10px] text-stone-400">Hoy at {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Microsoft Teams Card UI */}
                    <div className="bg-white rounded-xl border border-stone-200 shadow-md overflow-hidden">
                      {/* Card Header Banner */}
                      <div className="bg-[#464EB8] text-white p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-300" />
                            Registro de Fecha de Entrega Paramétricos
                          </h4>
                        </div>
                        <p className="text-[11px] text-indigo-100/80 mt-0.5">
                          Low-Voltage Estimator • Alerta de Proyecto
                        </p>
                      </div>

                      {/* Card Details */}
                      <div className="p-4 space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-lg border border-stone-100">
                          <div>
                            <span className="text-stone-400 block text-[10px] uppercase font-semibold">Proyecto</span>
                            <span className="font-bold text-stone-800">{projectName || 'Sin nombre'}</span>
                          </div>
                          <div>
                            <span className="text-stone-400 block text-[10px] uppercase font-semibold">Cliente</span>
                            <span className="font-bold text-stone-800">{clientName || 'N/A'}</span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-stone-200">
                            <span className="text-stone-400 block text-[10px] uppercase font-semibold">Fecha Entrega Paramétricos</span>
                            <span className="font-bold text-emerald-700 text-sm flex items-center gap-1.5 mt-0.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              {formattedDate}
                            </span>
                          </div>
                        </div>

                        {/* Responsables Table Preview */}
                        <div>
                          <p className="font-bold text-stone-700 mb-2 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#464EB8]" />
                            Responsables Notificados:
                          </p>
                          <div className="space-y-1.5">
                            {activeRecipients.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center justify-between p-2 rounded bg-stone-50 border border-stone-150 text-[11px]"
                              >
                                <div>
                                  <span className="font-semibold text-stone-800">{r.dept}: </span>
                                  <span className="text-stone-700">{r.name}</span>
                                </div>
                                <span className="font-mono text-stone-500 text-[10px]">
                                  {r.email || '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {customNotes && (
                          <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded text-amber-900 text-[11px]">
                            <strong>Observaciones:</strong> {customNotes}
                          </div>
                        )}

                        {/* Action Button Mockup */}
                        <div className="pt-2 border-t border-stone-100">
                          <button className="w-full bg-[#464EB8] hover:bg-[#3B3E99] text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Abrir Proyecto en Low-Voltage Estimator
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="mt-3 shrink-0 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="flex-1">
                  Verifica que los Responsables por Departamento tengan asignado su correo electrónico.
                </p>
              </div>
            </div>
          </div>

          {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
          <div className="shrink-0 border-t border-stone-200 bg-stone-50 px-6 py-4 flex items-center justify-between gap-4">
            <p className="text-xs text-stone-500 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-stone-400" />
              Notificación de Fecha Entrega Paramétricos activa
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-10 px-4 text-stone-600 hover:bg-stone-100"
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendEmailToChannel}
                className="h-10 px-4 text-stone-700 border-stone-300 hover:bg-stone-100 gap-1.5 font-medium"
                title="Enviar correo a responsables / canal Teams"
              >
                <Mail className="w-4 h-4 text-stone-500" />
                Correo a Canal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenTeamsDeepLink}
                className="h-10 px-4 text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-2 font-semibold"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Chat Teams
              </Button>
              <Button
                onClick={handleSendWebhook}
                disabled={isSending}
                className="h-10 px-6 gap-2 bg-[#464EB8] hover:bg-[#3B3E99] text-white font-bold shadow-md shadow-indigo-900/20 text-sm"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Enviando a Teams...' : 'Enviar a Teams'}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
