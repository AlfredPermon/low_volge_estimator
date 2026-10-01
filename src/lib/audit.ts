/**
 * audit.ts — Sistema de Auditoría de Accesos
 *
 * Registra cada acción de acceso (permitida o denegada) con:
 *  - Usuario (id + email)
 *  - Módulo y nivel de acción requerida
 *  - Resultado (ALLOWED | DENIED)
 *  - IP y User-Agent del request
 *  - Timestamp automático
 */

import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import type { AuthenticatedUser } from './auth';
import type { AppModule, PermissionLevel } from './permissions';

export type AuditResult = 'ALLOWED' | 'DENIED';

/**
 * Registra un evento de acceso en la tabla AuditLog.
 * Los errores de escritura son silenciosos (no deben interrumpir el flujo principal).
 */
export async function logAudit(
  user: AuthenticatedUser,
  module: AppModule | string,
  action: PermissionLevel | string,
  result: AuditResult,
  req?: NextRequest | Request
): Promise<void> {
  try {
    const ip =
      (req?.headers.get('x-forwarded-for') ?? req?.headers.get('x-real-ip') ?? null)
        ?.split(',')[0]
        ?.trim() ?? null;
    const userAgent = req?.headers.get('user-agent') ?? null;

    await prisma.auditLog.create({
      data: {
        userId:    user.id,
        userEmail: user.email,
        userRole:  user.role,
        module:    String(module),
        action:    String(action),
        result,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    // Auditoría no debe romper la respuesta principal
    console.warn('[audit] Error registrando auditoría:', err);
  }
}

/**
 * Registra un intento de acceso denegado (401 — sin sesión).
 */
export async function logUnauthorizedAttempt(
  module: string,
  req?: NextRequest | Request
): Promise<void> {
  try {
    const ip =
      (req?.headers.get('x-forwarded-for') ?? req?.headers.get('x-real-ip') ?? null)
        ?.split(',')[0]
        ?.trim() ?? null;
    const userAgent = req?.headers.get('user-agent') ?? null;

    await prisma.auditLog.create({
      data: {
        userId:    'UNAUTHENTICATED',
        userEmail: 'UNAUTHENTICATED',
        userRole:  'NONE',
        module:    String(module),
        action:    'ACCESS',
        result:    'DENIED',
        ip,
        userAgent,
      },
    });
  } catch {
    // Silencioso
  }
}
