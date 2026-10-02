const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPassword } = require('better-auth/crypto');

async function main() {
  const typoEmail = 'francisco.villegas@chritus.mx';
  const correctEmail = 'francisco.villegas@christus.mx';

  // Find user with typo email
  const existingUser = await prisma.user.findUnique({ where: { email: typoEmail } });
  
  if (existingUser) {
    console.log('Fixing typo for user:', existingUser.id);
    
    // Set correct email
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { email: correctEmail }
    });
    
    // ensure account has correct password hash for 'Francisco_2026'
    const hashedPw = await hashPassword('Francisco_2026');
    await prisma.account.updateMany({
      where: { userId: existingUser.id, providerId: 'credential' },
      data: { password: hashedPw }
    });
    
    console.log('User fixed successfully.');
  } else {
    console.log('User with typo not found. Maybe already fixed?');
  }
}

main().finally(() => prisma.$disconnect());
