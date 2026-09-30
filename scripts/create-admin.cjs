const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin.nuevo@empresa.com';
  const password = process.argv[3] || 'AdminPass123!';
  const name = process.argv[4] || 'Administrador Principal';

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

      console.log(`\n🎉 ¡Usuario Administrador Creado Exitosamente!`);
      console.log(`-----------------------------------------------`);
      console.log(`👤 Nombre:     ${name}`);
      console.log(`📧 Email:      ${email}`);
      console.log(`🔑 Password:   ${password}`);
      console.log(`🛡️  Rol:        admin (Acceso Total)`);
      console.log(`-----------------------------------------------\n`);
    }
  } catch (err) {
    console.error('❌ Error al crear usuario administrador:', err?.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
