import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_DAYS,
  isAdminRole,
  normalizeRole,
  type UserRole,
} from './auth-constants';
import { checkPermission, type AppModule, type PermissionLevel } from './permissions';
import { logAudit, logUnauthorizedAttempt } from './audit';
import { getAuthSecret, getAuthBaseURL, getMicrosoftProviderConfig } from './auth-config';

// Re-exportar para compatibilidad con importaciones existentes
export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS, isAdminRole, normalizeRole, checkPermission };
export type { UserRole, AppModule, PermissionLevel };

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  image?: string | null;
}

// ─── Instancia Better Auth ────────────────────────────────────────────────────

/**
 * Instancia del Servidor Better Auth.
 *
 * ⚠️ Seguridad: el secreto proviene de getAuthSecret() — sin fallback hardcodeado.
 * En producción la app falla al arrancar si BETTER_AUTH_SECRET falta o es débil.
 * Microsoft OAuth solo se registra si hay credenciales reales configuradas.
 */
const microsoftProvider = getMicrosoftProviderConfig();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  secret: getAuthSecret(),
  baseURL: getAuthBaseURL(),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  ...(microsoftProvider ? { socialProviders: { microsoft: microsoftProvider } } : {}),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'Consultor',
        required: false,
      },
      active: {
        type: 'boolean',
        defaultValue: true,
        required: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días de duración
    updateAge: 60 * 60 * 24, // Actualización diaria
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});

// ─── Utilidades de Criptografía ───────────────────────────────────────────────

/**
 * Generador de bytes aleatorios en formato Hex
 */
export function getRandomHex(bytesCount: number = 32): string {
  const bytes = new Uint8Array(bytesCount);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytesCount; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Digest SHA-256 usando Web Crypto API
 */
export async function computeSha256Hex(text: string): Promise<string> {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return getRandomHex(32);
}

/**
 * Hash de contraseña asíncrono con sal para usuarios creados vía API.
 *
 * Formato: `pbkdf2$<iteraciones>$<saltHex>$<hashHex>` (PBKDF2-SHA256, 120k it).
 * PBKDF2 es deliberadamente lento → resiste cracking offline ante filtración de BD.
 * Los hashes legacy `salt:sha256hex` siguen verificándose (ver verifyPasswordAsync)
 * y se migran de forma lazy al siguiente login exitoso.
 */
const PBKDF2_ITERATIONS = 120_000;
const PBKDF2_KEYLEN = 32; // bytes

async function pbkdf2Hex(password: string, saltHex: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const saltBytes = new Uint8Array(
    saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16))
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes as unknown as ArrayBuffer, iterations, hash: 'SHA-256' },
    keyMaterial,
    PBKDF2_KEYLEN * 8
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPasswordAsync(password: string, _saltInput?: string): Promise<string> {
  const salt = getRandomHex(16);
  const hash = await pbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verificación de contraseña asíncrona.
 * Soporta formato nuevo (PBKDF2) y legacy (`salt:sha256`) para no romper logins.
 * Retorna true además si el hash verificado es legacy → el llamador puede
 * re-hashear (migración lazy).
 */
export async function verifyPasswordAsync(password: string, storedHash: string): Promise<boolean> {
  try {
    if (storedHash.startsWith('pbkdf2$')) {
      const [, iterStr, salt, expected] = storedHash.split('$');
      const iterations = parseInt(iterStr, 10);
      if (!salt || !expected || !Number.isFinite(iterations)) return false;
      const computed = await pbkdf2Hex(password, salt, iterations);
      return timingSafeEqualHex(computed, expected);
    }

    // Formato legacy: salt:sha256(password+salt) — solo lectura/compatibilidad
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const computedHash = await computeSha256Hex(password + salt);
    return timingSafeEqualHex(computedHash, originalHash);
  } catch {
    return false;
  }
}

/** true si el hash almacenado usa el algoritmo legacy débil (debe migrarse). */
export function isLegacyPasswordHash(storedHash: string): boolean {
  return !!storedHash && !storedHash.startsWith('pbkdf2$');
}

/** Comparación en tiempo constante de dos strings hex. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Gestión de Sesión ────────────────────────────────────────────────────────

/**
 * Creación de sesión directa (Compatibilidad legacy)
 */
export async function createSession(userId: string): Promise<string> {
  const token = getRandomHex(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_MAX_AGE_DAYS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

/**
 * Destrucción de sesión directa
 */
export async function destroySession(token: string): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: { token },
    });
  } catch (err) {
    console.error('Error destroying session:', err);
  }
}

/**
 * Obtiene el usuario autenticado activo desde la sesión.
 *
 * Soporta:
 *  1. Better Auth API session (header-based)
 *  2. Session tokens legacy (cookie lve_session)
 *
 * SIEMPRE normaliza el rol al canon actual.
 * Retorna null si: no hay sesión, sesión expirada, o usuario inactivo.
 */
export async function getSessionUser(req?: NextRequest | Request): Promise<AuthenticatedUser | null> {
  try {
    let reqHeaders: Headers;

    if (req) {
      reqHeaders = req.headers;
    } else {
      reqHeaders = await headers();
    }

    // ── 1. Better Auth session ──────────────────────────────────────────────
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (session && session.user) {
      const user = session.user as any;
      // Usuario inactivo pierde acceso inmediatamente
      if (user.active === false) return null;
      return {
        id:     user.id,
        email:  user.email,
        name:   user.name || user.email.split('@')[0],
        role:   normalizeRole(user.role),
        active: user.active !== false,
        image:  user.image || null,
      };
    }

    // ── 2. Fallback para tokens legacy (cookie lve_session) ─────────────────
    let token: string | undefined;
    if (req) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
      if (match) token = match[1];
    }

    if (!token) return null;

    const legacySession = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    // Sesión no encontrada o usuario inactivo
    if (!legacySession || !legacySession.user || !legacySession.user.active) return null;

    // Sesión expirada → limpiar
    if (new Date() > new Date(legacySession.expiresAt)) {
      await prisma.session.delete({ where: { id: legacySession.id } }).catch(() => {});
      return null;
    }

    return {
      id:     legacySession.user.id,
      email:  legacySession.user.email,
      name:   legacySession.user.name,
      role:   normalizeRole((legacySession.user as any).role),
      active: legacySession.user.active,
      image:  (legacySession.user as any).image || null,
    };
  } catch (error) {
    console.error('Error en getSessionUser:', error);
    return null;
  }
}

// ─── Guard de permisos para API Routes ───────────────────────────────────────

/**
 * Guard de permisos centralizado para API routes.
 *
 * Verifica sesión activa + nivel de permiso en el módulo dado.
 * Registra auditoría en ambos casos (permitido y denegado).
 *
 * Uso:
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const guard = await requirePermission(req, 'PRECIOS', 'WRITE');
 *   if (guard instanceof NextResponse) return guard; // 401 o 403
 *   const { user } = guard;
 *   // ... lógica del handler
 * }
 * ```
 *
 * @returns { user } si el acceso está permitido, NextResponse (401|403) si no.
 */
export async function requirePermission(
  req: NextRequest | Request,
  module: AppModule,
  required: PermissionLevel,
  options?: { auditOnSuccess?: boolean }
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const user = await getSessionUser(req);

  // Sin sesión → 401 No autenticado
  if (!user) {
    await logUnauthorizedAttempt(module, req);
    return NextResponse.json(
      { error: 'No autorizado. Se requiere iniciar sesión.' },
      { status: 401 }
    );
  }

  // Sin permiso → 403 Forbidden
  if (!checkPermission(user.role, module, required)) {
    await logAudit(user, module, required, 'DENIED', req);
    return NextResponse.json(
      { error: `Acceso denegado. Tu perfil (${user.role}) no tiene permisos de ${required} en el módulo ${module}.` },
      { status: 403 }
    );
  }

  // Auditoría de éxito (opcional, evitar ruido en GETs frecuentes)
  if (options?.auditOnSuccess) {
    await logAudit(user, module, required, 'ALLOWED', req);
  }

  return { user };
}

/**
 * @deprecated Usar requirePermission() y checkPermission() de permissions.ts.
 * Mantenida para compatibilidad con código legacy que aún no fue migrado.
 */
export function hasPermission(userRole: UserRole | string, minRequiredRole: UserRole | string): boolean {
  const LEGACY_RANK: Record<string, number> = {
    'admin': 4, 'ADMINISTRADOR': 4,
    'Project Manager': 3, 'Proyect Manager': 3, 'Seguridad Electrónica': 3, 'Seguridad electronica': 3,
    'Seguridad Industrial': 2,
    'Medio Ambiente': 1, 'Consultor': 1,
    'SUPERVISOR': 3, 'OPERATIVO': 2, 'LECTURA': 1,
  };
  const userLevel = LEGACY_RANK[userRole] || 0;
  const requiredLevel = LEGACY_RANK[minRequiredRole] || 99;
  return userLevel >= requiredLevel;
}
