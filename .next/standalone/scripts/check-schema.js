const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = path.resolve(__dirname, '../db/custom.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const db = new PrismaClient();

async function main() {
  console.log('Using DB:', process.env.DATABASE_URL);
  const estimateCols = await db.$queryRawUnsafe('PRAGMA table_info(Estimate);');
  console.log('=== Estimate columns ===');
  console.log(estimateCols);

  const priceItemCols = await db.$queryRawUnsafe('PRAGMA table_info(PriceItem);');
  console.log('=== PriceItem columns ===');
  console.log(priceItemCols);

  const tables = await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table';");
  console.log('=== All tables ===');
  console.log(tables);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
