const { PrismaClient } = require('@prisma/client');
const { auth } = require('./src/lib/auth');

const prisma = new PrismaClient();

async function main() {
  const dummyEmail = 'testsignup@example.com';
  const password = 'Password_123!';
  
  await prisma.user.deleteMany({ where: { email: dummyEmail } });

  console.log('Registering user...');
  const res = await auth.api.signUpEmail({
    body: {
      email: dummyEmail,
      password: password,
      name: 'Test Signup',
    }
  });

  const account = await prisma.account.findFirst({
    where: { user: { email: dummyEmail } }
  });

  console.log('Account Password from signUpEmail:', account.password);

  const { verifyPassword, hashPassword } = require('better-auth/crypto');
  const isValid = await verifyPassword({ password, hash: account.password });
  console.log('IsValid according to verifyPassword:', isValid);
  
  const manualHash = await hashPassword(password);
  console.log('Manual Hash:', manualHash);
}

main().finally(() => prisma.$disconnect());
