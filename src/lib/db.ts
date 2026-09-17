import { prisma } from './prisma';

export const db = prisma;

const globalForDb = globalThis as unknown as {
  schemaEnsured: boolean | undefined;
};

export async function ensureDatabaseSchema() {
  if (globalForDb.schemaEnsured) return;
  globalForDb.schemaEnsured = true;
  try {
    const tables = (await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table';")) as Array<{ name: string }>;
    const tableNames = new Set(Array.isArray(tables) ? tables.map((t) => t.name) : []);

    // 1. Tabla User
    if (!tableNames.has('User')) {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "passwordHash" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'OPERATIVO',
          "active" BOOLEAN NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");');
    }

    // 2. Tabla Session
    if (!tableNames.has('Session')) {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "token" TEXT NOT NULL UNIQUE,
          "expiresAt" DATETIME NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");');
      await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");');
    }

    // 3. Columna userId en Estimate
    const estimateCols = (await db.$queryRawUnsafe('PRAGMA table_info(Estimate);')) as Array<{ name: string }>;
    const estColNames = new Set(Array.isArray(estimateCols) ? estimateCols.map((c) => c.name) : []);
    
    if (!estColNames.has('hasManualEdits')) {
      await db.$executeRawUnsafe('ALTER TABLE Estimate ADD COLUMN hasManualEdits BOOLEAN NOT NULL DEFAULT 0;');
    }
    if (!estColNames.has('floorplanConfig')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN floorplanConfig TEXT NOT NULL DEFAULT '{}';");
    }
    if (!estColNames.has('userId')) {
      await db.$executeRawUnsafe('ALTER TABLE Estimate ADD COLUMN userId TEXT;');
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Estimate_userId_idx" ON "Estimate"("userId");');
    }

    // 4. Columna userId en PriceItem
    const priceCols = (await db.$queryRawUnsafe('PRAGMA table_info(PriceItem);')) as Array<{ name: string }>;
    const priceColNames = new Set(Array.isArray(priceCols) ? priceCols.map((c) => c.name) : []);
    
    if (!priceColNames.has('userId')) {
      await db.$executeRawUnsafe('ALTER TABLE PriceItem ADD COLUMN userId TEXT;');
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceItem_userId_idx" ON "PriceItem"("userId");');
    }

    // 5. Historiales
    if (!tableNames.has('EstimateHistory')) {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EstimateHistory" (
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
    }

    if (!tableNames.has('PriceHistory')) {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PriceHistory" (
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
    }

  } catch (err) {
    console.error('Auto-migration error:', err);
  }
}