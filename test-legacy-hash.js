const { verifyPasswordAsync, hashPasswordAsync, computeSha256Hex } = require('./src/lib/auth');

async function main() {
  const password = 'Francisco_2026';

  const { prisma } = require('./src/lib/prisma');
  const account = await prisma.account.findFirst({
    where: { userId: '66x0wFUmsrvFMC3ao7b0h0BMcSmDlVZY' }
  });
  console.log('Stored Account Password Hash:', account.password);
  
  const isValidLegacy = await verifyPasswordAsync(password, account.password);
  console.log('Is Valid with verifyPasswordAsync (legacy check):', isValidLegacy);

  // Test what happens if we hash it with legacy algorithm manually
  const [salt, originalHash] = account.password.split(':');
  const computedHash = await computeSha256Hex(password + salt);
  console.log('Manual legacy compute:', computedHash === originalHash);
}

main().finally(() => process.exit(0));
