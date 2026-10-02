const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  const users = await prisma.user.findMany();
  console.log("Users:", users.map(u => ({ email: u.email, role: u.role, passwordHash: u.passwordHash })));
  
  const accounts = await prisma.account.findMany();
  console.log("Accounts:", accounts.map(a => ({ userId: a.userId, providerId: a.providerId, password: a.password ? 'HIDDEN' : 'NULL' })));
}

checkDb()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
