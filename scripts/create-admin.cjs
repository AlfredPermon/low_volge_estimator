const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || process.argv[2] || '').trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD || process.argv[3] || '';
  const name = (process.env.ADMIN_NAME || process.argv[4] || 'Administrador Principal').trim();

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL y ADMIN_INITIAL_PASSWORD son obligatorios.');
  }

  console.log(`\n⏳ Creando usuario administrador: ${email}...`);

  try {
    const { betterAuth } = require('better-auth');
    const { prismaAdapter } = require('better-auth/adapters/prisma');

    const auth = betterAuth({
      database: prismaAdapter(prisma, { provider: 'sqlite' }),
      emailAndPassword: { enabled: true },
    });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'admin', active: true },
      });
      console.log(`\n✅ El usuario ${email} ya existía y sus privilegios fueron actualizados a 'admin' (Acceso Total).`);
      return;
    }

    const created = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (created && created.user) {
      await prisma.user.update({
        where: { id: created.user.id },
        data: { role: 'admin', active: true },
      });

      console.log(`Administrador creado: ${email} (rol admin).`);
    }
  } catch (err) {
    console.error('❌ Error al crear usuario administrador:', err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
