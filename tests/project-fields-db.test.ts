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
  const dbFile = path.join(tmpDir, "project-fields-test.db");
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
        projectManager TEXT NOT NULL DEFAULT '',
        startDate TEXT NOT NULL DEFAULT '',
        endDate TEXT NOT NULL DEFAULT '',
        techResponsable TEXT NOT NULL DEFAULT '',
        envResponsable TEXT NOT NULL DEFAULT '',
        riskResponsable TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
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

describe("Project fields persistence (projectManager, dates, departmental responsibles)", () => {
  it("crea, lee y actualiza los 6 campos del proyecto correctamente", async () => {
    if (!dbAvailable || !db) return;

    estimateId = "est_proj_test_1";
    await db.$executeRawUnsafe(`DELETE FROM Estimate WHERE id = ?`, estimateId);

    await db.$executeRawUnsafe(
      `INSERT INTO Estimate (id, name, projectManager, startDate, endDate, techResponsable, envResponsable, riskResponsable) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      estimateId,
      "Proyecto Hospitalario",
      "Ing. Roberto Gómez",
      "2026-10-01T00:00:00.000Z",
      "2026-12-15T00:00:00.000Z",
      "Carlos Ruiz",
      "María Elena",
      "Jorge Martínez"
    );

    const found = (await db.$queryRawUnsafe(
      `SELECT projectManager, startDate, endDate, techResponsable, envResponsable, riskResponsable FROM Estimate WHERE id = ?`,
      estimateId
    )) as Array<{
      projectManager: string;
      startDate: string;
      endDate: string;
      techResponsable: string;
      envResponsable: string;
      riskResponsable: string;
    }>;

    assert.strictEqual(found?.[0]?.projectManager, "Ing. Roberto Gómez");
    assert.strictEqual(found?.[0]?.startDate, "2026-10-01T00:00:00.000Z");
    assert.strictEqual(found?.[0]?.endDate, "2026-12-15T00:00:00.000Z");
    assert.strictEqual(found?.[0]?.techResponsable, "Carlos Ruiz");
    assert.strictEqual(found?.[0]?.envResponsable, "María Elena");
    assert.strictEqual(found?.[0]?.riskResponsable, "Jorge Martínez");

    await db.$executeRawUnsafe(
      `UPDATE Estimate SET projectManager = ?, techResponsable = ? WHERE id = ?`,
      "Lic. Ana Torres",
      "Pedro Sánchez",
      estimateId
    );

    const updated = (await db.$queryRawUnsafe(
      `SELECT projectManager, techResponsable FROM Estimate WHERE id = ?`,
      estimateId
    )) as Array<{ projectManager: string; techResponsable: string }>;

    assert.strictEqual(updated?.[0]?.projectManager, "Lic. Ana Torres");
    assert.strictEqual(updated?.[0]?.techResponsable, "Pedro Sánchez");
  });
});
