import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db';
import { hashPasswordAsync } from '@/lib/auth';

export async function POST() {
  try {
    await ensureDatabaseSchema();

    const count = await prisma.user.count();
    if (count > 0) {
      // Si ya existen usuarios, nos aseguramos de que admin@prisa.com tenga rol 'admin'
      const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@prisa.com' } });
      if (existingAdmin && (existingAdmin.role === 'ADMINISTRADOR' || existingAdmin.role !== 'admin')) {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { role: 'admin' },
        });
      }
      return NextResponse.json({ message: 'Ya existen usuarios en la base de datos', seeded: false });
    }

    const defaultAdmin = await prisma.user.create({
      data: {
        email: 'admin@prisa.com',
        name: 'Administrador Principal',
        passwordHash: await hashPasswordAsync('Admin123!'),
        role: 'admin',
        active: true,
      },
    });

    const defaultElectronica = await prisma.user.create({
      data: {
        email: 'electronica@prisa.com',
        name: 'Ing. Seguridad Electrónica',
        passwordHash: await hashPasswordAsync('Elec123!'),
        role: 'Seguridad electrónica',
        active: true,
      },
    });

    const defaultIndustrial = await prisma.user.create({
      data: {
        email: 'industrial@prisa.com',
        name: 'Supervisor Seguridad Industrial',
        passwordHash: await hashPasswordAsync('Ind123!'),
        role: 'Seguridad Industrial',
        active: true,
      },
    });

    const defaultAmbiente = await prisma.user.create({
      data: {
        email: 'ambiente@prisa.com',
        name: 'Coordinador Medio Ambiente',
        passwordHash: await hashPasswordAsync('Amb123!'),
        role: 'Medio Ambiente',
        active: true,
      },
    });

    return NextResponse.json({
      message: 'Usuarios iniciales creados exitosamente',
      seeded: true,
      users: [defaultAdmin.email, defaultElectronica.email, defaultIndustrial.email, defaultAmbiente.email],
    });
  } catch (error) {
    console.error('Error seeding default users:', error);
    return NextResponse.json({ error: 'Error al sembrar usuarios iniciales' }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
