import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db';
import { getSessionUser, isAdminRole, hashPasswordAsync } from '@/lib/auth';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['admin', 'Seguridad electrónica', 'Seguridad Industrial', 'Medio Ambiente']),
  active: z.boolean().default(true),
});

// ─── GET: List users (Paginado, Filtros, Búsqueda, Exclusivo Admin) ──────────

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const currentUser = await getSessionUser(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 });
    }

    if (!isAdminRole(currentUser.role)) {
      return NextResponse.json(
        { error: "Acceso denegado. Únicamente el perfil 'admin' tiene permisos para acceder al módulo de gestión de usuarios." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const roleFilter = searchParams.get('role') || 'all';
    const statusFilter = searchParams.get('status') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));

    const whereCondition: Record<string, unknown> = {};

    if (search) {
      whereCondition.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (roleFilter !== 'all') {
      whereCondition.role = roleFilter;
    }

    if (statusFilter === 'active') {
      whereCondition.active = true;
    } else if (statusFilter === 'inactive') {
      whereCondition.active = false;
    }

    const [users, totalCount, totalUsers, activeUsers, inactiveUsers, adminUsers] = await Promise.all([
      prisma.user.findMany({
        where: whereCondition,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where: whereCondition }),
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.user.count({ where: { active: false } }),
      prisma.user.count({ where: { OR: [{ role: 'admin' }, { role: 'ADMINISTRADOR' }] } }),
    ]);

    return NextResponse.json({
      data: users,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminUsers,
      },
    });
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({ error: 'Error interno del servidor al consultar usuarios' }, { status: 500 });
  }
}

// ─── POST: Create a new user (Exclusivo Admin) ──────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const currentUser = await getSessionUser(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 });
    }

    if (!isAdminRole(currentUser.role)) {
      return NextResponse.json(
        { error: "Acceso denegado. Únicamente el perfil 'admin' puede registrar nuevos usuarios." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Error de validación en los datos del usuario', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, role, active } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya se encuentra registrado en el sistema' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPasswordAsync(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        passwordHash,
        role,
        active,
      },
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

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error interno del servidor al crear el usuario' }, { status: 500 });
  }
}
