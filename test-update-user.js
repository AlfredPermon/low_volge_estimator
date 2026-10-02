const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('better-auth/crypto');

const prisma = new PrismaClient();

async function main() {
  const id = '66x0wFUmsrvFMC3ao7b0h0BMcSmDlVZY'; // Francisco
  
  // Update password to 'Francisco_2026'
  const newPassword = 'Francisco_2026';
  const hashedPw = await hashPassword(newPassword);
  
  console.log('New Hash generated:', hashedPw);
  
  const result = await prisma.account.updateMany({
    where: { userId: id, providerId: 'credential' },
    data: { password: hashedPw },
  });
  
  console.log('Account Update Result:', result);
  
  // Try to sign in!
  const { auth } = require('./src/lib/auth');
  try {
    const res = await auth.api.signInEmail({
      body: {
        email: 'francisco.villegas@chritus.mx',
        password: 'Francisco_2026'
      }
    });
    console.log('SignIn Response:', res);
  } catch (err) {
    console.error('SignIn Error:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
