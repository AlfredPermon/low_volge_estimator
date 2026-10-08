const { PrismaClient } = require('@prisma/client');
const path = require('path');
(async () => {
  const db = new PrismaClient({ datasourceUrl: 'file:' + path.resolve('prisma/db/custom.db') });
  console.log(await db.$queryRawUnsafe('SELECT typeof(createdAt) t, createdAt, typeof(updatedAt) tu, updatedAt FROM "User" LIMIT 2'));
  console.log(await db.$queryRawUnsafe('SELECT typeof(createdAt) t, createdAt FROM "PriceItem" LIMIT 1'));
  console.log(await db.$queryRawUnsafe('SELECT COUNT(*) c FROM "CustomField"'));
  await db.$disconnect();
  const { verifyPassword } = await import('better-auth/crypto');
  const h = '3f30692f42e584863df4378be60dbc75:21fa8a6ae819757c1b79efbb9434dea5167656906dd1e10c739ebc1cc571f954d56ba12e6c33f7f6edbfb9c535278f7226f421e6168b2b9d5040959fc2264d7f';
  console.log('Hash bat valido para AdminPassword123!:', await verifyPassword({ hash: h, password: 'AdminPassword123!' }));
  // Hash generado con node:crypto (sin dependencias) usando parametros Better Auth
  const crypto = require('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync('AdminPassword123!'.normalize('NFKC'), salt, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 });
  console.log('Hash node:crypto compatible:', await verifyPassword({ hash: `${salt}:${key.toString('hex')}`, password: 'AdminPassword123!' }));
})();
