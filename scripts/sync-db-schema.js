const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

async function migrateDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log(`Database file not found: ${dbPath}`);
    return;
  }
  console.log(`Migrating database at: ${dbPath}`);
  const db = new PrismaClient({
    datasourceUrl: `file:${path.resolve(dbPath)}`,
  });

  try {
    // 1. Check Estimate.hasManualEdits
    const estimateCols = await db.$queryRawUnsafe('PRAGMA table_info(Estimate);');
    const hasManualEditsExists = Array.isArray(estimateCols) && estimateCols.some((c) => c.name === 'hasManualEdits');
    if (!hasManualEditsExists) {
      console.log('Adding missing column `hasManualEdits` to `Estimate` table...');
      await db.$executeRawUnsafe('ALTER TABLE Estimate ADD COLUMN hasManualEdits BOOLEAN NOT NULL DEFAULT 0;');
      console.log('✓ `hasManualEdits` column added successfully.');
    } else {
      console.log('✓ Column `hasManualEdits` already exists in `Estimate`.');
    }

    const hasFloorplanConfigExists = Array.isArray(estimateCols) && estimateCols.some((c) => c.name === 'floorplanConfig');
    if (!hasFloorplanConfigExists) {
      console.log('Adding missing column `floorplanConfig` to `Estimate` table...');
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN floorplanConfig TEXT NOT NULL DEFAULT '{}';");
      console.log('✓ `floorplanConfig` column added successfully.');
    } else {
      console.log('✓ Column `floorplanConfig` already exists in `Estimate`.');
    }

    // 2. Check EstimateHistory table
    const tables = await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table';");
    const estimateHistoryExists = Array.isArray(tables) && tables.some((t) => t.name === 'EstimateHistory');
    if (!estimateHistoryExists) {
      console.log('Creating missing table `EstimateHistory`...');
      await db.$executeRawUnsafe(`
        CREATE TABLE "EstimateHistory" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "estimateId" TEXT NOT NULL,
          "changeType" TEXT NOT NULL,
          "user" TEXT NOT NULL DEFAULT 'Sistema / Usuario',
          "details" TEXT NOT NULL,
          "snapshot" TEXT NOT NULL DEFAULT '{}',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "EstimateHistory_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EstimateHistory_estimateId_idx" ON "EstimateHistory"("estimateId");');
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EstimateHistory_createdAt_idx" ON "EstimateHistory"("createdAt");');
      console.log('✓ Table `EstimateHistory` created successfully.');
    } else {
      console.log('✓ Table `EstimateHistory` already exists.');
    }

    // 3. Check PriceHistory table
    const priceHistoryExists = Array.isArray(tables) && tables.some((t) => t.name === 'PriceHistory');
    if (!priceHistoryExists) {
      console.log('Creating missing table `PriceHistory`...');
      await db.$executeRawUnsafe(`
        CREATE TABLE "PriceHistory" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "priceItemId" TEXT NOT NULL,
          "previousCost" REAL NOT NULL DEFAULT 0,
          "newCost" REAL NOT NULL DEFAULT 0,
          "delta" REAL NOT NULL DEFAULT 0,
          "deltaPercent" REAL NOT NULL DEFAULT 0,
          "changedBy" TEXT NOT NULL DEFAULT '',
          "reason" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PriceHistory_priceItemId_fkey" FOREIGN KEY ("priceItemId") REFERENCES "PriceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceHistory_priceItemId_idx" ON "PriceHistory"("priceItemId");');
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceHistory_createdAt_idx" ON "PriceHistory"("createdAt");');
      console.log('✓ Table `PriceHistory` created successfully.');
    } else {
      console.log('✓ Table `PriceHistory` already exists.');
    }

  } catch (err) {
    console.error(`Error migrating ${dbPath}:`, err);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const rootDb = path.join(__dirname, '../db/custom.db');
  await migrateDatabase(rootDb);

  const seedDb = path.join(__dirname, '../dist-package/db/seed_custom.db');
  await migrateDatabase(seedDb);

  const distDb = path.join(__dirname, '../dist-package/db/custom.db');
  await migrateDatabase(distDb);
}

main().catch(console.error);
