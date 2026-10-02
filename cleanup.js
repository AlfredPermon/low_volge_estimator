const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const typoEmail = 'francisco.villegas@chritus.mx';
  await prisma.user.deleteMany({ where: { email: typoEmail } });
  console.log('Deleted typo user.');
}

main().finally(() => prisma.$disconnect());
