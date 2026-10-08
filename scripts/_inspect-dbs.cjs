const { PrismaClient } = require('@prisma/client');
const path = require('path');

async function inspect(p) {
  const db = new PrismaClient({ datasourceUrl: 'file:' + path.resolve(p) });
  try {
    const tables = await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('\n== ' + p);
    console.log('Tablas:', tables.map(t => t.name).join(', '));
    for (const t of ['User', 'Account', 'PriceItem', 'Estimate']) {
      if (tables.some(x => x.name === t)) {
        const r = await db.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "${t}"`);
        console.log(`  ${t}: ${Number(r[0].c)} filas`);
      }
    }
    if (tables.some(x => x.name === 'User')) {
      const users = await db.$queryRawUnsafe('SELECT u.email, u.role, u.active, a.providerId, substr(a.password,1,20) as pw FROM "User" u LEFT JOIN "Account" a ON a.userId = u.id');
      console.log('  Usuarios:', users);
    }
  } catch (e) { console.log('ERR', e.message); }
  finally { await db.$disconnect(); }
}

(async () => {
  for (const p of process.argv.slice(2)) await inspect(p);
})();
