import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST() {
  try {
    await ensureDatabaseSchema();

    const existingUser = await prisma.user.findUnique({ where: { email: 'admin@empresa.com' } });
    
    if (!existingUser) {
      await auth.api.signUpEmail({
        body: {
          email: 'admin@empresa.com',
          password: 'AdminPassword123!',
          name: 'Administrador Principal',
        },
      });

      await prisma.user.update({
        where: { email: 'admin@empresa.com' },
        data: { role: 'admin' },
      });

      return NextResponse.json({
        message: 'Usuario inicial creado exitosamente en Better Auth',
        seeded: true,
        credentials: {
          email: 'admin@empresa.com',
          password: 'AdminPassword123!',
        },
      });
    }

    return NextResponse.json({
      message: 'El usuario inicial ya existe en el sistema',
      seeded: false,
      email: 'admin@empresa.com',
    });
  } catch (error) {
    console.error('Error al inicializar usuario admin:', error);
    return NextResponse.json({ error: 'Error al sembrar usuario de administración' }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
