/**
 * ─────────────────────────────────────────────────────────────────────────────
 * permissions.ts — POLÍTICA CENTRAL DE ACCESO (Fuente Única de Verdad)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Reglas de diseño:
 *  • Deny-by-default: si un módulo/rol no está declarado → NONE.
 *  • Esta matriz es la única fuente de verdad. Cualquier cambio de negocio
 *    debe reflejarse aquí primero.
 *  • La UI usa getPermissionLevel() para mostrar/ocultar elementos.
 *  • El backend usa checkPermission() en cada API route — nunca confiar
 *    en el rol enviado por el cliente.
 *
 * Leyenda de niveles:
 *  NONE  → Sin acceso
 *  READ  → Lectura / Consulta
 *  WRITE → Lectura y edición
 *  ADMIN → Administración completa (incluye gestión de usuarios, importaciones masivas)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type UserRole, normalizeRole } from './auth-constants';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Niveles de acceso en orden ascendente de privilegio. */
export type PermissionLevel = 'NONE' | 'READ' | 'WRITE' | 'ADMIN';

/** Identificadores de módulo — mapean a vistas UI y rutas API. */
export type AppModule =
  | 'CONFIGURACION'
  | 'PROYECTO'
  | 'CCTV'
  | 'ACCESO'
  | 'VOCEO'
  | 'INCENDIO'
  | 'FACTORES'
  | 'MANO_DE_OBRA'
  | 'VALIDACIONES'
  | 'PRECIOS'
  | 'PRESUPUESTO'
  | 'PLANO_ESPACIAL'
  | 'MEDIO_AMBIENTE'
  | 'CRONOGRAMA'
  | 'REPORTES'
  | 'ANALISIS'
  | 'REG_VIVOTEK'
  | 'USUARIOS';

// ─── Jerarquía de niveles para comparación ───────────────────────────────────

const LEVEL_RANK: Record<PermissionLevel, number> = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
  ADMIN: 3,
};

// ─── Matriz de permisos (Fuente Única de Verdad) ─────────────────────────────
//
// Columnas: Admin | Project Manager | Seguridad Electrónica | Seguridad Industrial | Medio Ambiente | Consultor
//
// Actualización: 2026-10-01 — Correcciones aprobadas por usuario:
//   • Project Manager → Configuración: W (era N)
//   • Seg. Electrónica → Incendio: W (era N)
//   • Seg. Industrial → Configuración: W (era N)
//   • Seg. Industrial → 1 Proyecto: W (era N)
//   • Seg. Industrial → 2 CCTV: N (era W)
//   • Seg. Industrial → Plano Espacial: W (era N)
//   • Seg. Industrial → Reg. VIVOTEK: N (era W)
//   • Medio Ambiente → Precios: W (era R)
//   • Medio Ambiente → Análisis: W (era N)
//   • Medio Ambiente → Reg. VIVOTEK: N (era W)

const MODULE_PERMISSIONS: Record<AppModule, Record<UserRole, PermissionLevel>> = {

  CONFIGURACION: {
    'admin':                 'ADMIN',
    'Project Manager':       'WRITE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'WRITE',
    'Medio Ambiente':        'WRITE',
    'Consultor':             'READ',
  },

  PROYECTO: {
    'admin':                 'ADMIN',
    'Project Manager':       'ADMIN',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'WRITE',
    'Medio Ambiente':        'WRITE',
    'Consultor':             'READ',
  },

  CCTV: {
    'admin':                 'ADMIN',
    'Project Manager':       'NONE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'NONE',
    'Medio Ambiente':        'NONE',
    'Consultor':             'READ',
  },

  ACCESO: {
    'admin':                 'ADMIN',
    'Project Manager':       'NONE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'NONE',
    'Medio Ambiente':        'NONE',
    'Consultor':             'READ',
  },

  VOCEO: {
    'admin':                 'ADMIN',
    'Project Manager':       'NONE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'NONE',
    'Medio Ambiente':        'NONE',
    'Consultor':             'READ',
  },

  INCENDIO: {
    'admin':                 'ADMIN',
    'Project Manager':       'NONE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'NONE',
    'Medio Ambiente':        'NONE',
    'Consultor':             'READ',
  },

  FACTORES: {
    'admin':                 'ADMIN',
    'Project Manager':       'NONE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'NONE',
    'Medio Ambiente':        'NONE',
    'Consultor':             'READ',
  },

  MANO_DE_OBRA: {
    'admin':                 'ADMIN',
    'Project Manager':       'NONE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'NONE',
    'Medio Ambiente':        'NONE',
    'Consultor':             'READ',
  },

  VALIDACIONES: {
    'admin':                 'ADMIN',
    'Project Manager':       'ADMIN',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'NONE',
    'Medio Ambiente':        'NONE',
    'Consultor':             'READ',
  },

  PRECIOS: {
    'admin':                 'ADMIN',
    'Project Manager':       'WRITE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'WRITE',
    'Medio Ambiente':        'WRITE',
    'Consultor':             'READ',
    // ⚠️ Nota: La importación masiva (/api/prices/import) requiere nivel ADMIN
    // independientemente de este valor. Ver api/prices/import/route.ts.
  },

  PRESUPUESTO: {
    'admin':                 'ADMIN',
    'Project Manager':       'WRITE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'WRITE',
    'Medio Ambiente':        'WRITE',
    'Consultor':             'READ',
  },

  PLANO_ESPACIAL: {
    'admin':                 'ADMIN',
    'Project Manager':       'WRITE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'WRITE',
    'Medio Ambiente':        'WRITE',
    'Consultor':             'READ',
  },

  MEDIO_AMBIENTE: {
    'admin':                 'ADMIN',
    'Project Manager':       'WRITE',
    'Seguridad Electrónica': 'NONE',
    'Seguridad Industrial':  'NONE',
    'Medio Ambiente':        'WRITE',
    'Consultor':             'READ',
  },

  CRONOGRAMA: {
    'admin':                 'ADMIN',
    'Project Manager':       'WRITE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'WRITE',
    'Medio Ambiente':        'WRITE',
    'Consultor':             'READ',
  },

  REPORTES: {
    'admin':                 'ADMIN',
    'Project Manager':       'WRITE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'WRITE',
    'Medio Ambiente':        'WRITE',
    'Consultor':             'READ',
  },

  ANALISIS: {
    'admin':                 'ADMIN',
    'Project Manager':       'WRITE',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'WRITE',
    'Medio Ambiente':        'WRITE',
    'Consultor':             'NONE',
  },

  REG_VIVOTEK: {
    'admin':                 'ADMIN',
    'Project Manager':       'ADMIN',
    'Seguridad Electrónica': 'WRITE',
    'Seguridad Industrial':  'NONE',
    'Medio Ambiente':        'NONE',
    'Consultor':             'READ',
  },

  USUARIOS: {
    'admin':                 'ADMIN',
    'Project Manager':       'NONE',
    'Seguridad Electrónica': 'NONE',
    'Seguridad Industrial':  'NONE',
    'Medio Ambiente':        'NONE',
    'Consultor':             'NONE',
  },

} as const;

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Verifica si el usuario tiene el nivel mínimo requerido en el módulo dado.
 *
 * @param role   - Rol del usuario (se normaliza automáticamente)
 * @param module - Módulo a verificar
 * @param required - Nivel mínimo requerido
 * @returns true si el acceso está permitido
 *
 * @example
 * checkPermission('Seguridad Electrónica', 'PRECIOS', 'READ')  // true
 * checkPermission('Seguridad Electrónica', 'PRECIOS', 'ADMIN') // false
 * checkPermission('unknown_role', 'PRECIOS', 'READ')           // false (normaliza a Consultor, READ=true para Precios)
 */
export function checkPermission(
  role: UserRole | string | null | undefined,
  module: AppModule,
  required: PermissionLevel
): boolean {
  const normalized = normalizeRole(role ?? undefined);
  const modulePerms = MODULE_PERMISSIONS[module];
  if (!modulePerms) return false; // Módulo no declarado → deny
  const granted: PermissionLevel = modulePerms[normalized] ?? 'NONE';
  return LEVEL_RANK[granted] >= LEVEL_RANK[required];
}

/**
 * Retorna el nivel de permiso exacto de un rol para un módulo.
 * Útil en la UI para ocultar/deshabilitar secciones y botones.
 *
 * @example
 * getPermissionLevel('Consultor', 'ANALISIS') // 'NONE'
 * getPermissionLevel('admin', 'USUARIOS')     // 'ADMIN'
 */
export function getPermissionLevel(
  role: UserRole | string | null | undefined,
  module: AppModule
): PermissionLevel {
  const normalized = normalizeRole(role ?? undefined);
  return MODULE_PERMISSIONS[module]?.[normalized] ?? 'NONE';
}

/**
 * Verifica si el nivel de permiso permite operaciones de lectura (READ o superior).
 */
export function canRead(role: UserRole | string | null | undefined, module: AppModule): boolean {
  return checkPermission(role, module, 'READ');
}

/**
 * Verifica si el nivel de permiso permite operaciones de escritura (WRITE o superior).
 */
export function canWrite(role: UserRole | string | null | undefined, module: AppModule): boolean {
  return checkPermission(role, module, 'WRITE');
}

/**
 * Verifica si el nivel de permiso es administración completa.
 */
export function canAdmin(role: UserRole | string | null | undefined, module: AppModule): boolean {
  return checkPermission(role, module, 'ADMIN');
}

// Re-exportar UserRole para evitar imports múltiples
export type { UserRole };
