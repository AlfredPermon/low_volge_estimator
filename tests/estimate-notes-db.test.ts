import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";

let dbAvailable = false;
let db: PrismaClient | null = null;
let estimateId: string | null = null;

before(async () => {
  const tmpDir = path.join(process.cwd(), "tests", ".tmp");
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  const dbFile = path.join(tmpDir, "estimate-notes-test.db");
  if (existsSync(dbFile)) {
    try {
      unlinkSync(dbFile);
    } catch {}
  }
  const url = `file:${dbFile.replace(/\\/g, "/")}`;

  try {
    db = new PrismaClient({ datasources: { db: { url } } });
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Estimate (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Sin nombre',
        clientName TEXT NOT NULL DEFAULT '',
        projectName TEXT NOT NULL DEFAULT '',
        currency TEXT NOT NULL DEFAULT 'MXN',
        revision TEXT NOT NULL DEFAULT 'Rev. 1',
        responsible TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        factorsNotes TEXT NOT NULL DEFAULT '',
        wasteFactorCable REAL NOT NULL DEFAULT 0.10,
        wasteFactorConduit REAL NOT NULL DEFAULT 0.15,
        verticalDrop REAL NOT NULL DEFAULT 3.0,
        rackAllowance REAL NOT NULL DEFAULT 5.0,
        indirectFactor REAL NOT NULL DEFAULT 0.12,
        ivaRate REAL NOT NULL DEFAULT 0.16,
        roundingPolicy INTEGER NOT NULL DEFAULT 2,
        laborTechnicianRate REAL NOT NULL DEFAULT 950.0,
        laborOfficerRate REAL NOT NULL DEFAULT 750.0,
        laborHelperRate REAL NOT NULL DEFAULT 500.0,
        useCrewBasedLabor BOOLEAN NOT NULL DEFAULT 0,
        cctvConfig TEXT NOT NULL DEFAULT '{}',
        accessConfig TEXT NOT NULL DEFAULT '{}',
        pagingConfig TEXT NOT NULL DEFAULT '{}',
        fireConfig TEXT NOT NULL DEFAULT '{}',
        lineItems TEXT NOT NULL DEFAULT '[]',
        subtotalMaterials REAL NOT NULL DEFAULT 0,
        subtotalLabor REAL NOT NULL DEFAULT 0,
        subtotalEngineering REAL NOT NULL DEFAULT 0,
        subtotalDirect REAL NOT NULL DEFAULT 0,
        subtotalIndirects REAL NOT NULL DEFAULT 0,
        grandTotal REAL NOT NULL DEFAULT 0,
        iva REAL NOT NULL DEFAULT 0,
        totalWithIva REAL NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

after(async () => {
  if (db) {
    await db.$disconnect();
  }
});

describe("estimate factorsNotes persistence", () => {
  it("crea, lee y actualiza factorsNotes", async () => {
    if (!dbAvailable || !db) return;

    estimateId = "est_test_1";
    await db.$executeRawUnsafe(`DELETE FROM Estimate WHERE id = ?`, estimateId);

    await db.$executeRawUnsafe(
      `INSERT INTO Estimate (id, name, factorsNotes) VALUES (?, ?, ?)`,
      estimateId,
      "Test",
      "Nota técnica inicial"
    );

    const found = (await db.$queryRawUnsafe(
      `SELECT factorsNotes FROM Estimate WHERE id = ?`,
      estimateId
    )) as Array<{ factorsNotes: string }>;
    assert.strictEqual(found?.[0]?.factorsNotes ?? "", "Nota técnica inicial");

    await db.$executeRawUnsafe(
      `UPDATE Estimate SET factorsNotes = ? WHERE id = ?`,
      "Nota técnica actualizada",
      estimateId
    );

    const updated = (await db.$queryRawUnsafe(
      `SELECT factorsNotes FROM Estimate WHERE id = ?`,
      estimateId
    )) as Array<{ factorsNotes: string }>;
    assert.strictEqual(updated?.[0]?.factorsNotes ?? "", "Nota técnica actualizada");
  });
});
