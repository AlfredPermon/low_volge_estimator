import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { ensureDatabaseSchema } from './db';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS, isAdminRole, UserRole } from './auth-constants';

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS, isAdminRole };
export type { UserRole };

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
}

/**
 * Generador de bytes aleatorios usando Web Crypto API
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
 * Calcula un digest SHA-256 usando Web Crypto API (100% universal y compatible con Next.js Turbopack)
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
 * Genera un hash de contraseña asíncrono con SHA-256 y sal aleatoria
 */
export async function hashPasswordAsync(password: string, saltInput?: string): Promise<string> {
  const salt = saltInput || getRandomHex(16);
  const hash = await computeSha256Hex(password + salt);
  return `${salt}:${hash}`;
}

/**
 * Genera un hash síncrono compatible con sal
 */
export function hashPassword(password: string): string {
  const salt = getRandomHex(16);
  let hashNum = 5381;
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    hashNum = (hashNum * 33) ^ str.charCodeAt(i);
  }
  const hashStr = Math.abs(hashNum).toString(16) + getRandomHex(20);
  return `${salt}:${hashStr}`;
}

/**
 * Verificación asíncrona de contraseña usando Web Crypto SHA-256
 */
export async function verifyPasswordAsync(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const computedHash = await computeSha256Hex(password + salt);
    return computedHash === originalHash || verifyPassword(password, storedHash);
  } catch {
    return false;
  }
}

/**
 * Verificación síncrona de contraseña
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    let hashNum = 5381;
    const str = password + salt;
    for (let i = 0; i < str.length; i++) {
      hashNum = (hashNum * 33) ^ str.charCodeAt(i);
    }
    const computedPrefix = Math.abs(hashNum).toString(16);
    return originalHash.startsWith(computedPrefix) || originalHash === computedPrefix;
  } catch {
    return false;
  }
}

/**
 * Crea una sesión en BD para el usuario y genera el token aleatorio
 */
export async function createSession(userId: string): Promise<string> {
  await ensureDatabaseSchema();
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
 * Elimina la sesión actual de la base de datos
 */
export async function destroySession(token: string): Promise<void> {
  try {
    await ensureDatabaseSchema();
    await prisma.session.deleteMany({
      where: { token },
    });
  } catch (err) {
    console.error('Error destroying session:', err);
  }
}

/**
 * Obtiene el usuario autenticado desde la cookie de solicitud o contexto de Next.js
 */
export async function getSessionUser(req?: NextRequest | Request): Promise<AuthenticatedUser | null> {
  try {
    await ensureDatabaseSchema();
    let token: string | undefined;

    if (req) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
      if (match) {
        token = match[1];
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      } catch {
        // Fuera del contexto HTTP de Next.js
      }
    }

    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || !session.user || !session.user.active) return null;

    if (new Date() > new Date(session.expiresAt)) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: (session.user.role as UserRole) || 'OPERATIVO',
      active: session.user.active,
    };
  } catch (error) {
    console.error('Error in getSessionUser:', error);
    return null;
  }
}

/**
 * Jerarquía de permisos de usuario (RBAC)
 */
const ROLE_HIERARCHY: Record<string, number> = {
  admin: 4,
  ADMINISTRADOR: 4,
  'Seguridad electrónica': 3,
  SUPERVISOR: 3,
  'Seguridad Industrial': 2,
  OPERATIVO: 2,
  'Medio Ambiente': 1,
  LECTURA: 1,
};

export function hasPermission(userRole: UserRole | string, minRequiredRole: UserRole | string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[minRequiredRole] || 99;
  return userLevel >= requiredLevel;
}
