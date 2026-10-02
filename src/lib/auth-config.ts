/**
 * ─────────────────────────────────────────────────────────────────────────────
 * auth-config.ts — GESTIÓN SEGURA DE SECRETOS (Fail-fast, sin fallbacks)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Reglas de diseño (plan de remediación V2):
 *  • En PRODUCCIÓN: si falta BETTER_AUTH_SECRET o es débil → la app NO arranca.
 *    Nunca se usa un secreto hardcodeado como respaldo silencioso.
 *  • En DESARROLLO: se genera/ persiste un secreto local aleatorio en
 *    `.auth-secret.dev` (archivito fuera de git) para no romper el dx,
 *    pero NUNCA un valor fijo conocido públicamente.
 *  • Proveedor Microsoft OAuth: si no hay credenciales reales, el proveedor
 *    se deshabilita (no se registran placeholders que habiliten flujos rotos).
 */

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** Valores obvios / comprometidos que jamás deben aceptarse. */
const WEAK_SECRETS = [
  'secret',
  'changeme',
  'change-in-env',
  'lve-production-auth-secret-key-change-in-env',
  'dev-secret',
  'hardcoded-dev-secret',
  'password',
  'key',
];

function isWeakSecret(value: string): boolean {
  const lower = value.toLowerCase();
  if (WEAK_SECRETS.some((w) => lower.includes(w))) return true;
  // Secretos triviales: todos los mismos caracteres o secuencia simple
  if (/^(.)\1*$/.test(value)) return true;
  return false;
}

let cachedDevSecret: string | null = null;

/**
 * Genera/persiste un secreto aleatorio SOLO para desarrollo local.
 * Se guarda en `.auth-secret.dev` (debe estar en .gitignore).
 */
function getOrCreateDevSecret(): string {
  if (cachedDevSecret) return cachedDevSecret;
  const secretFile = path.join(process.cwd(), '.auth-secret.dev');
  try {
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, 'utf8').trim();
      if (existing.length >= 32 && !isWeakSecret(existing)) {
        cachedDevSecret = existing;
        return existing;
      }
    }
  } catch {
    // ignore read errors → regenerate
  }
  const generated = randomBytes(48).toString('base64url');
  try {
    fs.writeFileSync(secretFile, generated, { mode: 0o600 });
  } catch {
    // Si no se puede persistir, al menos la sesión vive en memoria del proceso.
  }
  cachedDevSecret = generated;
  return generated;
}

/**
 * Devuelve el secreto de Better Auth. Falla rápido en producción si no está
 * definido o es débil — elimina la clase de vulnerabilidad "fallback hardcodeado".
 */
export function getAuthSecret(): string {
  const raw = (process.env.BETTER_AUTH_SECRET || '').trim();

  if (raw.length > 0) {
    if (raw.length < 32) {
      if (IS_PRODUCTION) {
        throw new Error(
          '[auth-config] BETTER_AUTH_SECRET tiene menos de 32 caracteres. Rótalo con uno fuerte: openssl rand -base64 48'
        );
      }
      console.warn('[auth-config] BETTER_AUTH_SECRET es corto (<32 chars); usa uno fuerte en producción.');
    } else if (isWeakSecret(raw)) {
      if (IS_PRODUCTION) {
        throw new Error('[auth-config] BETTER_AUTH_SECRET contiene un valor reconocido como débil/comprometido.');
      }
      console.warn('[auth-config] BETTER_AUTH_SECRET parece un valor débil/conocido.');
    }
    return raw;
  }

  // Sin variable definida
  if (IS_PRODUCTION) {
    throw new Error(
      '[auth-config] BETTER_AUTH_SECRET es obligatorio en producción. Genera uno con: openssl rand -base64 48'
    );
  }

  console.warn(
    '[auth-config] BETTER_AUTH_SECRET no definido → usando secreto aleatorio local de desarrollo (.auth-secret.dev).'
  );
  return getOrCreateDevSecret();
}

/**
 * Credenciales de Microsoft OAuth. Retorna null si no están configuradas
 * (el proveedor debe omitirse de la configuración de Better Auth en ese caso).
 */
export function getMicrosoftProviderConfig(): {
  clientId: string;
  clientSecret: string;
  tenantId: string;
} | null {
  const clientId = (process.env.MICROSOFT_CLIENT_ID || '').trim();
  const clientSecret = (process.env.MICROSOFT_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) return null;
  if (clientId.startsWith('00000000') || /placeholder/i.test(clientId) || /placeholder/i.test(clientSecret)) {
    return null;
  }

  const tenantId = (process.env.MICROSOFT_TENANT_ID || 'common').trim() || 'common';
  return { clientId, clientSecret, tenantId };
}

/**
 * URL base de autenticación. En producción exige una URL explícita y segura
 * para evitar host-header injection en links de autenticación.
 */
export function getAuthBaseURL(): string {
  const raw = (process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || '').trim();
  if (raw) return raw;
  if (IS_PRODUCTION) {
    throw new Error('[auth-config] BETTER_AUTH_URL es obligatoria en producción (ej. https://tu-dominio.com).');
  }
  return 'http://localhost:3000';
}
