const { auth } = require('./src/lib/auth');
const { prisma } = require('./src/lib/prisma');

async function testAuth() {
  console.log('--- Testing User Record ---');
  const user = await prisma.user.findUnique({
    where: { id: '66x0wFUmsrvFMC3ao7b0h0BMcSmDlVZY' }
  });
  console.log('User in DB:', user);

  const account = await prisma.account.findFirst({
    where: { userId: '66x0wFUmsrvFMC3ao7b0h0BMcSmDlVZY' }
  });
  console.log('Account in DB:', account ? { ...account, password: account.password ? '[HASH PRESENT]' : null } : null);

  // Test sign in with exact email in DB (chritus.mx)
  try {
    const res1 = await auth.api.signInEmail({
      body: {
        email: 'francisco.villegas@chritus.mx',
        password: 'Francisco_2026'
      }
    });
    console.log('SignIn with chritus.mx success:', !!res1?.user);
  } catch (err) {
    console.log('SignIn with chritus.mx failed:', err.message);
  }

  // Test sign in with christus.mx
  try {
    const res2 = await auth.api.signInEmail({
      body: {
        email: 'francisco.villegas@christus.mx',
        password: 'Francisco_2026'
      }
    });
    console.log('SignIn with christus.mx success:', !!res2?.user);
  } catch (err) {
    console.log('SignIn with christus.mx failed:', err.message);
  }
}

testAuth().finally(() => prisma.$disconnect());
