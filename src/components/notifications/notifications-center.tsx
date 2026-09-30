'use client';

import { useState } from 'react';
import { useNotificationStore, type SystemNotification } from '@/store/notification-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  MessageSquare,
  Info,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NotificationsCenterProps {
  onOpenTeamsModal?: () => void;
}

export default function NotificationsCenter({ onOpenTeamsModal }: NotificationsCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, removeNotification } =
    useNotificationStore();
  const [open, setOpen] = useState(false);

  const getIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'teams':
        return <MessageSquare className="w-4 h-4 text-[#464EB8]" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      const now = new Date();
      const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);

      if (diffMin < 1) return 'Hace un momento';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-9 w-9 p-0 rounded-lg border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-all"
          title="Centro de Notificaciones"
        >
          <Bell className="w-4 h-4 text-stone-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-600 text-[10px] font-bold text-white items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded-xl border border-stone-200 shadow-xl overflow-hidden bg-white/95 backdrop-blur-md z-50"
      >
        {/* Cabecera del Centro de Notificaciones */}
        <div className="bg-stone-900 text-white p-3.5 px-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white leading-tight">Centro de Notificaciones</h3>
              <p className="text-[10px] text-stone-400">Alertas de Proyecto y Teams</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-[10px] text-stone-300 hover:text-white hover:bg-stone-800 gap-1"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-3 h-3 text-emerald-400" />
                <span>Leídas</span>
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                className="h-7 w-7 p-0 text-stone-400 hover:text-red-400 hover:bg-stone-800"
                title="Limpiar historial"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Notificación rápida de Teams CTA */}
        {onOpenTeamsModal && (
          <div className="p-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-[#464EB8] shrink-0" />
              <span className="text-xs font-semibold text-indigo-900 truncate">
                Notificar Fecha Entrega Teams
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setOpen(false);
                onOpenTeamsModal();
              }}
              className="h-7 px-3 text-[11px] bg-[#464EB8] hover:bg-[#3B3E99] text-white font-bold shrink-0 gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Notificar
            </Button>
          </div>
        )}

        {/* Lista de Notificaciones */}
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="py-10 text-center px-4">
              <Bell className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-stone-600">Sin notificaciones pendientes</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Las alertas de proyectos y Teams aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.read && markAsRead(item.id)}
                  className={cn(
                    'p-3 px-4 flex items-start gap-3 transition-colors cursor-pointer group hover:bg-stone-50',
                    !item.read ? 'bg-emerald-50/30' : 'bg-white'
                  )}
                >
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-stone-100 group-hover:bg-white transition-colors border border-stone-200/60">
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-xs font-semibold truncate', !item.read ? 'text-stone-900 font-bold' : 'text-stone-700')}>
                        {item.title}
                      </p>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-stone-600 mt-0.5 leading-snug line-clamp-2">
                      {item.message}
                    </p>

                    {item.projectName && (
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-400">
                        <span className="font-medium text-stone-500 truncate">
                          📁 {item.projectName}
                        </span>
                        {item.parametricDeliveryDate && (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <CalendarDays className="w-2.5 h-2.5" />
                            {new Date(item.parametricDeliveryDate + (item.parametricDeliveryDate.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('es-MX')}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400">
                      <span>{formatTimestamp(item.timestamp)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-0.5"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Pie del desplegable */}
        <div className="bg-stone-50 p-2.5 px-4 border-t border-stone-200 text-center">
          <p className="text-[10px] text-stone-400">
            Low-Voltage Estimator • Integración Teams Activa
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
