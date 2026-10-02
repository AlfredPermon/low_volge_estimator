import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db';
import { requirePermission, auth } from '@/lib/auth';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum([
    'admin',
    'Project Manager',
    'Seguridad Electrónica',
    'Seguridad Industrial',
    'Medio Ambiente',
    'Consultor',
  ]),
  active: z.boolean().default(true),
});

// ─── GET: List users (Paginado, Filtros, Búsqueda, Exclusivo Admin) ──────────

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const guard = await requirePermission(request, 'USUARIOS', 'ADMIN');
    if (guard instanceof NextResponse) return guard;
    const { user: currentUser } = guard;

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
      if (roleFilter === 'Project Manager' || roleFilter === 'Proyect Manager') {
        whereCondition.OR = [
          { role: 'Project Manager' },
          { role: 'Proyect Manager' },
        ];
      } else {
        whereCondition.role = roleFilter;
      }
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
//
// IMPORTANTE: Usa auth.api.signUpEmail() de Better Auth para registrar la
// contraseña en la tabla Account (el mismo mecanismo que usa authClient.signIn.email()
// en el login). NO usar prisma.user.create() con passwordHash propio — ese campo
// no es reconocido por el flujo de autenticación de Better Auth.
//
// Flujo:
//   1. auth.api.signUpEmail() → crea User + Account con la contraseña hasheada por BA
//   2. prisma.user.update()   → aplica el rol y estado active del nuevo perfil

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const guard = await requirePermission(request, 'USUARIOS', 'ADMIN', { auditOnSuccess: true });
    if (guard instanceof NextResponse) return guard;

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

    // Verificar duplicado antes de llamar a Better Auth
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya se encuentra registrado en el sistema' },
        { status: 400 }
      );
    }

    const cleanPassword = password.trim();

    // ── Registrar en Better Auth ─────────────────────────────────────────────
    // Esto crea el registro User + Account con la contraseña hasheada de forma
    // compatible con authClient.signIn.email() del frontend.
    const signUpResult = await auth.api.signUpEmail({
      body: { 
        email: cleanEmail, 
        password: cleanPassword, 
        name,
        role,
        active
      },
    });

    if (!signUpResult?.user) {
      return NextResponse.json(
        { error: 'Error al registrar el usuario en el sistema de autenticación' },
        { status: 500 }
      );
    }

    // ── Aplicar rol y estado active al usuario recién creado ─────────────────
    const updatedUser = await prisma.user.update({
      where: { email: cleanEmail },
      data: { role, active },
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

    return NextResponse.json(updatedUser, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);

    // Better Auth puede lanzar error si el email ya existe en su tabla Account
    const msg: string = error?.message || '';
    if (
      msg.toLowerCase().includes('already exists') ||
      msg.toLowerCase().includes('duplicate') ||
      msg.toLowerCase().includes('unique')
    ) {
      return NextResponse.json(
        { error: 'El correo electrónico ya se encuentra registrado en el sistema' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor al crear el usuario' },
      { status: 500 }
    );
  }
}
