const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserTable() {
  try {
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys=OFF;');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User_new" (
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
    await prisma.$executeRawUnsafe(`
      INSERT OR IGNORE INTO "User_new" ("id", "email", "passwordHash", "name", "role", "active", "createdAt", "updatedAt")
      SELECT "id", "email", "passwordHash", "name", "role", "active", "createdAt", "updatedAt" FROM "User";
    `);
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "User";');
    await prisma.$executeRawUnsafe('ALTER TABLE "User_new" RENAME TO "User";');
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");');
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys=ON;');
    console.log('✅ SQLite User table fixed: passwordHash now has DEFAULT ""');
  } catch (err) {
    console.error('❌ Error fixing User table:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserTable();
