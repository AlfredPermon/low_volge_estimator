import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'teams' | 'info' | 'alert' | 'success';
  timestamp: string;
  read: boolean;
  projectName?: string;
  parametricDeliveryDate?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationStore {
  notifications: SystemNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: [
        {
          id: 'init_welcome',
          title: 'Sistema de Notificaciones Activo',
          message: 'Notificaciones automáticas por Teams vinculadas a Fecha Entrega Paramétricos.',
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false,
        },
      ],
      unreadCount: 1,

      addNotification: (data) =>
        set((state) => {
          const newNotification: SystemNotification = {
            ...data,
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
            read: false,
          };
          const updated = [newNotification, ...state.notifications].slice(0, 50); // Máximo 50 notificaciones
          const unread = updated.filter((n) => !n.read).length;
          return {
            notifications: updated,
            unreadCount: unread,
          };
        }),

      markAsRead: (id) =>
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
          };
        }),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      clearNotifications: () =>
        set({
          notifications: [],
          unreadCount: 0,
        }),

      removeNotification: (id) =>
        set((state) => {
          const updated = state.notifications.filter((n) => n.id !== id);
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
          };
        }),
    }),
    {
      name: 'lve.notifications.v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
