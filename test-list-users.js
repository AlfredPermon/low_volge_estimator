const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log('USERS_LIST:', JSON.stringify(users, null, 2));

  const accounts = await prisma.account.findMany({
    select: { id: true, userId: true, accountId: true, providerId: true },
  });
  console.log('ACCOUNTS_LIST:', JSON.stringify(accounts, null, 2));
}

main().finally(() => prisma.$disconnect());
