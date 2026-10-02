const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { auth } = require('./src/lib/auth');

async function main() {
  const reqBody = {
    name: 'Francisco Villegas',
    email: 'francisco.villegas@christus.mx',
    password: 'Francisco_2026',
    role: 'Consultor',
    active: true
  };
  
  // delete if exists
  await prisma.user.deleteMany({ where: { email: reqBody.email } });
  
  try {
    console.log('Calling signUpEmail...');
    const signUpResult = await auth.api.signUpEmail({
      body: reqBody
    });
    console.log('signUpResult:', signUpResult);
    
    // update role via prisma just like route.ts does
    const updatedUser = await prisma.user.update({
      where: { email: reqBody.email },
      data: { role: reqBody.role, active: reqBody.active },
    });
    console.log('User created & updated:', updatedUser);
    
  } catch(err) {
    console.error('Error:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
