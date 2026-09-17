export const SESSION_COOKIE_NAME = 'lve_session';
export const SESSION_MAX_AGE_DAYS = 7;

export type UserRole =
  | 'admin'
  | 'Seguridad electrónica'
  | 'Seguridad Industrial'
  | 'Medio Ambiente'
  | 'ADMINISTRADOR'
  | 'SUPERVISOR'
  | 'OPERATIVO'
  | 'LECTURA';

/**
 * Valida si un rol cuenta con privilegios de Administrador (compatible con Cliente y Servidor)
 */
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const norm = role.trim().toLowerCase();
  return norm === 'admin' || norm === 'administrador';
}
