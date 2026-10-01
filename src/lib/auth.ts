import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS, isAdminRole, UserRole } from './auth-constants';

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS, isAdminRole };
export type { UserRole };

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  image?: string | null;
}

/**
 * Instancia del Servidor Better Auth
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  secret: process.env.BETTER_AUTH_SECRET || 'lve-production-auth-secret-key-change-in-env',
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || 'placeholder_client_id',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'placeholder_client_secret',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'OPERATIVO',
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
 * Hash de contraseña asíncrono con sal para usuarios creados vía API
 */
export async function hashPasswordAsync(password: string, saltInput?: string): Promise<string> {
  const salt = saltInput || getRandomHex(16);
  const hash = await computeSha256Hex(password + salt);
  return `${salt}:${hash}`;
}

/**
 * Verificación de contraseña asíncrona
 */
export async function verifyPasswordAsync(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const computedHash = await computeSha256Hex(password + salt);
    return computedHash === originalHash;
  } catch {
    return false;
  }
}

/**
 * Creación de sesión directa (Compatibilidad)
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
 * Obtiene el usuario autenticado (Soporta Better Auth API & Session Tokens)
 */
export async function getSessionUser(req?: NextRequest | Request): Promise<AuthenticatedUser | null> {
  try {
    let reqHeaders: Headers;

    if (req) {
      reqHeaders = req.headers;
    } else {
      reqHeaders = await headers();
    }

    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (session && session.user) {
      const user = session.user as any;
      if (user.active === false) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        role: (user.role as UserRole) || 'OPERATIVO',
        active: user.active !== false,
        image: user.image || null,
      };
    }

    // Fallback para tokens legacy
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

    if (!legacySession || !legacySession.user || !legacySession.user.active) return null;
    if (new Date() > new Date(legacySession.expiresAt)) {
      await prisma.session.delete({ where: { id: legacySession.id } }).catch(() => {});
      return null;
    }

    return {
      id: legacySession.user.id,
      email: legacySession.user.email,
      name: legacySession.user.name,
      role: (legacySession.user.role as UserRole) || 'OPERATIVO',
      active: legacySession.user.active,
      image: (legacySession.user as any).image || null,
    };
  } catch (error) {
    console.error('Error en getSessionUser:', error);
    return null;
  }
}

/**
 * Jerarquía de permisos (RBAC)
 */
const ROLE_HIERARCHY: Record<string, number> = {
  admin: 4,
  ADMINISTRADOR: 4,
  'Project Manager': 3,
  'Proyect Manager': 3,
  'Seguridad electrónica': 3,
  SUPERVISOR: 3,
  'Seguridad Industrial': 2,
  OPERATIVO: 2,
  'Medio Ambiente': 1,
  Consultor: 1,
  LECTURA: 1,
};

export function hasPermission(userRole: UserRole | string, minRequiredRole: UserRole | string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[minRequiredRole] || 99;
  return userLevel >= requiredLevel;
}
