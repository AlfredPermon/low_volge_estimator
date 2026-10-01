// ─── Constantes de sesión ────────────────────────────────────────────────────
export const SESSION_COOKIE_NAME = 'lve_session';
export const SESSION_MAX_AGE_DAYS = 7;

/**
 * Perfiles canónicos del sistema — 7 perfiles finales.
 * No usar alias como 'Proyect Manager', 'ADMINISTRADOR', 'SUPERVISOR', etc.
 * Todo rol entrante debe pasar por normalizeRole() antes de compararse.
 */
export type UserRole =
  | 'admin'
  | 'Project Manager'
  | 'Seguridad Electrónica'
  | 'Seguridad Industrial'
  | 'Medio Ambiente'
  | 'Consultor';

/**
 * Mapa de normalización — convierte cualquier alias legacy al rol canónico.
 * El fallback es 'Consultor' (perfil más restrictivo) para perfiles desconocidos.
 */
const ROLE_ALIAS_MAP: Record<string, UserRole> = {
  // Admin
  'admin': 'admin',
  'administrador': 'admin',
  // Project Manager (incluye el typo histórico)
  'project manager': 'Project Manager',
  'proyect manager': 'Project Manager',
  // Seguridad Electrónica
  'seguridad electrónica': 'Seguridad Electrónica',
  'seguridad electronica': 'Seguridad Electrónica',
  'seguridad electrónica ': 'Seguridad Electrónica', // trailing space defensivo
  // Seguridad Industrial
  'seguridad industrial': 'Seguridad Industrial',
  // Medio Ambiente
  'medio ambiente': 'Medio Ambiente',
  // Consultor
  'consultor': 'Consultor',
  // Roles legacy del sistema anterior (compatibilidad)
  'supervisor': 'Project Manager',
  'operativo': 'Seguridad Electrónica',
  'lectura': 'Consultor',
};

/**
 * Normaliza cualquier string de rol al tipo UserRole canónico.
 * Siempre retorna un valor seguro; default → 'Consultor' (más restrictivo).
 */
export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'Consultor';
  return ROLE_ALIAS_MAP[role.toLowerCase().trim()] ?? 'Consultor';
}

/**
 * Valida si un rol cuenta con privilegios de Administrador.
 * Compatible con Cliente y Servidor.
 */
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  return normalizeRole(role) === 'admin';
}
