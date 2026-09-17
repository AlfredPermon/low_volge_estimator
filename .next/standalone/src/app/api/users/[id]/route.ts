import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db';
import { getSessionUser, isAdminRole, hashPasswordAsync } from '@/lib/auth';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  email: z.string().email('Correo electrónico no válido').optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['admin', 'Seguridad electrónica', 'Seguridad Industrial', 'Medio Ambiente']).optional(),
  active: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET: Get single user ───────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDatabaseSchema();
    const currentUser = await getSessionUser(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 });
    }

    if (!isAdminRole(currentUser.role)) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user detail:', error);
    return NextResponse.json({ error: 'Error al consultar datos del usuario' }, { status: 500 });
  }
}

// ─── PUT: Update user (Full edit, credentials, role, status) ───────────────

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDatabaseSchema();
    const currentUser = await getSessionUser(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 });
    }

    if (!isAdminRole(currentUser.role)) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { id } = await params;
    const existingUser = await prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos no válidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, role, active } = parsed.data;

    // Protecciones para evitar auto-bloqueo del administrador en sesión
    if (currentUser.id === id) {
      if (active === false) {
        return NextResponse.json(
          { error: 'No puedes desactivar tu propia cuenta de administrador mientras te encuentres autenticado.' },
          { status: 400 }
        );
      }
      if (role && !isAdminRole(role)) {
        return NextResponse.json(
          { error: 'No puedes revocar tu propio rol de administrador mientras estés en sesión.' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;

    if (email !== undefined && email.toLowerCase().trim() !== existingUser.email) {
      const cleanEmail = email.toLowerCase().trim();
      const duplicate = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: 'El correo electrónico ya pertenece a otro usuario.' }, { status: 400 });
      }
      updateData.email = cleanEmail;
    }

    if (role !== undefined) updateData.role = role;
    if (active !== undefined) updateData.active = active;

    if (password && password.trim().length > 0) {
      updateData.passwordHash = await hashPasswordAsync(password.trim());
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error al actualizar información del usuario' }, { status: 500 });
  }
}

// ─── PATCH: Quick toggle active status ──────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDatabaseSchema();
    const currentUser = await getSessionUser(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    if (!isAdminRole(currentUser.role)) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { id } = await params;

    if (currentUser.id === id) {
      return NextResponse.json(
        { error: 'No puedes cambiar el estado de tu propia cuenta de administrador en sesión.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const newActiveState = typeof body.active === 'boolean' ? body.active : !targetUser.active;

    const updated = await prisma.user.update({
      where: { id },
      data: { active: newActiveState },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: `Cuenta ${updated.active ? 'activada' : 'desactivada'} correctamente`,
      user: updated,
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    return NextResponse.json({ error: 'Error al cambiar estado de cuenta del usuario' }, { status: 500 });
  }
}
