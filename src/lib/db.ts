import { prisma } from './prisma';

export const db = prisma;

const globalForDb = globalThis as unknown as {
  schemaEnsured: boolean | undefined;
};

export async function ensureDatabaseSchema() {
  try {
    const tables = (await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table';")) as Array<{ name: string }>;
    const tableNames = new Set(Array.isArray(tables) ? tables.map((t) => t.name) : []);

    // 1. Tabla User
    if (!tableNames.has('User')) {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "passwordHash" TEXT DEFAULT '',
          "name" TEXT NOT NULL,
          "emailVerified" BOOLEAN NOT NULL DEFAULT 0,
          "image" TEXT,
          "role" TEXT NOT NULL DEFAULT 'OPERATIVO',
          "active" BOOLEAN NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");');
    } else {
      // Verificar columnas adicionales en User
      const userCols = (await db.$queryRawUnsafe('PRAGMA table_info("User");')) as Array<{ name: string }>;
      const userColNames = new Set(Array.isArray(userCols) ? userCols.map((c) => c.name) : []);
      if (!userColNames.has('emailVerified')) {
        await db.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN emailVerified BOOLEAN NOT NULL DEFAULT 0;');
      }
      if (!userColNames.has('image')) {
        await db.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN image TEXT;');
      }
    }

    // 2. Tabla Session
    if (!tableNames.has('Session')) {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "token" TEXT NOT NULL UNIQUE,
          "expiresAt" DATETIME NOT NULL,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");');
      await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");');
    } else {
      // Verificar columnas en Session
      const sessionCols = (await db.$queryRawUnsafe('PRAGMA table_info("Session");')) as Array<{ name: string }>;
      const sessionColNames = new Set(Array.isArray(sessionCols) ? sessionCols.map((c) => c.name) : []);
      if (!sessionColNames.has('ipAddress')) {
        await db.$executeRawUnsafe('ALTER TABLE "Session" ADD COLUMN ipAddress TEXT;');
      }
      if (!sessionColNames.has('userAgent')) {
        await db.$executeRawUnsafe('ALTER TABLE "Session" ADD COLUMN userAgent TEXT;');
      }
      if (!sessionColNames.has('updatedAt')) {
        await db.$executeRawUnsafe('ALTER TABLE "Session" ADD COLUMN updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;');
      }
    }

    // 3. Tabla Account (Better Auth OAuth)
    if (!tableNames.has('Account')) {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Account" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "accountId" TEXT NOT NULL,
          "providerId" TEXT NOT NULL,
          "accessToken" TEXT,
          "refreshToken" TEXT,
          "accessTokenExpiresAt" DATETIME,
          "refreshTokenExpiresAt" DATETIME,
          "scope" TEXT,
          "idToken" TEXT,
          "password" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");');
    }

    // 4. Tabla Verification (Better Auth Verification)
    if (!tableNames.has('Verification')) {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Verification" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "identifier" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "expiresAt" DATETIME NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    // 5. Columna userId y project fields en Estimate
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
    if (!estColNames.has('projectManager')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN projectManager TEXT NOT NULL DEFAULT '';");
    }
    if (!estColNames.has('startDate')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN startDate TEXT NOT NULL DEFAULT '';");
    }
    if (!estColNames.has('endDate')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN endDate TEXT NOT NULL DEFAULT '';");
    }
    if (!estColNames.has('parametricDeliveryDate')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN parametricDeliveryDate TEXT NOT NULL DEFAULT '';");
    }
    if (!estColNames.has('techResponsable')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN techResponsable TEXT NOT NULL DEFAULT '';");
    }
    if (!estColNames.has('techResponsableEmail')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN techResponsableEmail TEXT NOT NULL DEFAULT '';");
    }
    if (!estColNames.has('envResponsable')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN envResponsable TEXT NOT NULL DEFAULT '';");
    }
    if (!estColNames.has('envResponsableEmail')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN envResponsableEmail TEXT NOT NULL DEFAULT '';");
    }
    if (!estColNames.has('riskResponsable')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN riskResponsable TEXT NOT NULL DEFAULT '';");
    }
    if (!estColNames.has('riskResponsableEmail')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN riskResponsableEmail TEXT NOT NULL DEFAULT '';");
    }
    if (!estColNames.has('projectManagerEmail')) {
      await db.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN projectManagerEmail TEXT NOT NULL DEFAULT '';");
    }

    // 6. Columna userId en PriceItem
    const priceCols = (await db.$queryRawUnsafe('PRAGMA table_info(PriceItem);')) as Array<{ name: string }>;
    const priceColNames = new Set(Array.isArray(priceCols) ? priceCols.map((c) => c.name) : []);

    if (!priceColNames.has('userId')) {
      await db.$executeRawUnsafe('ALTER TABLE PriceItem ADD COLUMN userId TEXT;');
      await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceItem_userId_idx" ON "PriceItem"("userId");');
    }

    // 7. Historiales
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

    // 8. Tabla CustomField
    if (!tableNames.has('CustomField')) {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CustomField" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "type" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "CustomField_type_value_key" ON "CustomField"("type", "value");');

      const defaultFields = [
        { type: 'system', value: 'CCTV' },
        { type: 'system', value: 'ACCESO' },
        { type: 'system', value: 'VOCEO' },
        { type: 'system', value: 'INCENDIO' },
        { type: 'system', value: 'CANALIZACION' },
        { type: 'system', value: 'CABLEADO' },
        { type: 'system', value: 'GENERAL' },
        { type: 'category', value: 'Equipo' },
        { type: 'category', value: 'Accesorio' },
        { type: 'category', value: 'Consumible' },
        { type: 'category', value: 'Mano de Obra' },
        { type: 'category', value: 'Servicio' },
      ];
      for (const field of defaultFields) {
        await db.$executeRawUnsafe(
          `INSERT OR IGNORE INTO "CustomField" ("id", "type", "value", "createdAt") VALUES ('cf_' || lower(hex(randomblob(8))), '${field.type}', '${field.value}', CURRENT_TIMESTAMP);`
        );
      }
    }

    // 9. Sanitizar fechas con formato no ISO en Estimate para prevenir errores Prisma P2023
    try {
      const estimates = (await db.$queryRawUnsafe('SELECT id, createdAt, updatedAt FROM "Estimate"')) as Array<{ id: string; createdAt: any; updatedAt: any }>;
      if (Array.isArray(estimates)) {
        for (const est of estimates) {
          if (typeof est.createdAt === 'string' && est.createdAt && !/^\d{4}-\d{2}-\d{2}/.test(est.createdAt)) {
            const d = new Date(est.createdAt);
            if (!isNaN(d.getTime())) {
              await db.$executeRawUnsafe('UPDATE "Estimate" SET "createdAt" = ? WHERE "id" = ?', d.toISOString(), est.id);
            }
          }
          if (typeof est.updatedAt === 'string' && est.updatedAt && !/^\d{4}-\d{2}-\d{2}/.test(est.updatedAt)) {
            const d = new Date(est.updatedAt);
            if (!isNaN(d.getTime())) {
              await db.$executeRawUnsafe('UPDATE "Estimate" SET "updatedAt" = ? WHERE "id" = ?', d.toISOString(), est.id);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Fechas sanitization skip:', e);
    }

  } catch (err) {
    console.error('Auto-migration error:', err);
  }
}