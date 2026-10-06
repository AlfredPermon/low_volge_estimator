import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db';
import { verifyPasswordAsync, createSession, hashPasswordAsync, isLegacyPasswordHash, SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS } from '@/lib/auth';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`login:${ip}`, 5, 60 * 1000); // Max 5 intentos por minuto por IP

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 1 minuto.' },
        { status: 429 }
      );
    }

    await ensureDatabaseSchema();
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de inicio de sesión no válidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        accounts: {
          where: { providerId: 'credential' },
          select: { id: true, password: true },
          take: 1,
        },
      },
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas o usuario desactivado' },
        { status: 401 }
      );
    }

    const credentialAccount = user.accounts[0] ?? null;

    let isValid = false;
    let authenticatedViaLegacyHash = false;

    if (credentialAccount?.password) {
      isValid = await verifyPassword({ password, hash: credentialAccount.password });
    } else if (user.passwordHash) {
      authenticatedViaLegacyHash = true;
      isValid = await verifyPasswordAsync(password, user.passwordHash);
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas o usuario desactivado' },
        { status: 401 }
      );
    }

    // ── Backfill lazy: cuentas legacy -> Account.password (Better Auth) ──
    if (authenticatedViaLegacyHash && user.passwordHash) {
      try {
        const betterAuthHash = await hashPassword(password);

        if (credentialAccount) {
          await prisma.account.update({
            where: { id: credentialAccount.id },
            data: { password: betterAuthHash },
          });
        } else {
          await prisma.account.create({
            data: {
              userId: user.id,
              accountId: user.id,
              providerId: 'credential',
              password: betterAuthHash,
            },
          });
        }
      } catch (migrateErr) {
        console.error('Error backfilling Better Auth credential account:', migrateErr);
      }
    }

    // ── Migración lazy de hashes legacy (salt:sha256 → PBKDF2) ──
    if (user.passwordHash && isLegacyPasswordHash(user.passwordHash)) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: await hashPasswordAsync(password) },
        });
      } catch (migrateErr) {
        // No bloquear el login si la migración falla; se reintentará next login.
        console.error('Error migrating legacy password hash:', migrateErr);
      }
    }

    const token = await createSession(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in login API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el inicio de sesión' },
      { status: 500 }
    );
  }
}
