import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db';
import { verifyPasswordAsync, createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_DAYS } from '@/lib/auth';
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
    });

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas o usuario desactivado' },
        { status: 401 }
      );
    }

    const isValid = await verifyPasswordAsync(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas o usuario desactivado' },
        { status: 401 }
      );
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
