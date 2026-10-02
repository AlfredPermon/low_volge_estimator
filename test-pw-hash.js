const { hashPassword, verifyPassword } = require('better-auth/crypto');

async function main() {
  const password = 'Francisco_2026';
  const hashed = await hashPassword(password);
  console.log('Hashed:', hashed);
  const isValid = await verifyPassword({ password, hash: hashed });
  console.log('Is Valid with verifyPassword:', isValid);

  const { prisma } = require('./src/lib/prisma');
  const account = await prisma.account.findFirst({
    where: { userId: '66x0wFUmsrvFMC3ao7b0h0BMcSmDlVZY' }
  });
  console.log('Stored Account Password Hash:', account.password);
  
  const isValidStored = await verifyPassword({ password, hash: account.password });
  console.log('Is Valid with Stored Hash:', isValidStored);
}

main();
