import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";

/**
 * Tests de integración del flujo CRUD de precios contra la base SQLite.
 *
 * Estos tests usan el cliente de Prisma directamente (sin servidor HTTP)
 * para verificar que el modelo `PriceItem` cumple con las operaciones
 * de Crear, Leer, Actualizar y Eliminar de forma atómica.
 *
 * Si la BD no está disponible (p.ej. en CI sin DB), se omiten.
 */

// Réplica del esquema del route POST /api/prices (mismas validaciones)
const createPriceItemSchema = z.object({
  sku: z.string().default(""),
  system: z.string().min(1, "System is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().default(""),
  model: z.string().default(""),
  description: z.string().min(1, "Description is required"),
  unit: z.string().default("pza"),
  unitCost: z.number().min(0).default(0),
  performance: z.number().min(0).default(0),
  provider: z.string().default(""),
  certifications: z.string().default(""),
  datasheetUrl: z.string().default(""),
  notes: z.string().default(""),
  crewTechnician: z.number().min(0).default(0),
  crewOfficer: z.number().min(0).default(0),
  crewHelper: z.number().min(0).default(0),
  laborHours: z.number().min(0).default(0),
  active: z.boolean().default(true),
});

let dbAvailable = false;
let db: PrismaClient | null = null;
let testItemId: string | null = null;

before(async () => {
  const tmpDir = path.join(process.cwd(), "tests", ".tmp");
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  const dbFile = path.join(tmpDir, "prices-test.db");
  if (existsSync(dbFile)) {
    try { unlinkSync(dbFile); } catch {}
  }
  const memoryUrl = `file:${dbFile.replace(/\\/g, "/")}`;

  try {
    db = new PrismaClient({ datasources: { db: { url: memoryUrl } } });
    // Crear las tablas necesarias con un esquema equivalente al de Prisma
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS PriceItem (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL DEFAULT '',
        system TEXT NOT NULL,
        category TEXT NOT NULL,
        brand TEXT NOT NULL DEFAULT '',
        model TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'pza',
        unitCost REAL NOT NULL DEFAULT 0,
        performance REAL NOT NULL DEFAULT 0,
        deviceType TEXT NOT NULL DEFAULT '',
        provider TEXT NOT NULL DEFAULT '',
        certifications TEXT NOT NULL DEFAULT '',
        datasheetUrl TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        crewTechnician REAL NOT NULL DEFAULT 0,
        crewOfficer REAL NOT NULL DEFAULT 0,
        crewHelper REAL NOT NULL DEFAULT 0,
        laborHours REAL NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT 1,
        userId TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch (err) {
    // Mostrar el error en consola para diagnosticar
    console.error("[prices-crud.test] No se pudo inicializar la BD de pruebas:", err);
    if (db) {
      try { await db.$disconnect(); } catch { /* ignore */ }
    }
    db = null;
    dbAvailable = false;
  }
});

after(async () => {
  if (db && testItemId) {
    try {
      await db.priceItem.delete({ where: { id: testItemId } });
    } catch {
      // best-effort cleanup
    }
  }
  if (db) {
    await db.$disconnect();
  }
});

describe("CRUD PriceItem (validación de esquema Zod)", () => {
  it("acepta un payload completo y válido", () => {
    const result = createPriceItemSchema.safeParse({
      sku: "TEST-CCTV-001",
      system: "CCTV",
      category: "Equipo",
      brand: "Hikvision",
      model: "DS-2CD2T87G2",
      description: "Cámara test de integración",
      unit: "pza",
      unitCost: 7800,
      performance: 0,
    });
    assert.strictEqual(result.success, true, JSON.stringify(result.error?.flatten()));
    if (result.success) {
      assert.strictEqual(result.data.sku, "TEST-CCTV-001");
      assert.strictEqual(result.data.system, "CCTV");
      assert.strictEqual(result.data.unitCost, 7800);
      assert.strictEqual(result.data.active, true); // default
    }
  });

  it("rechaza un payload sin system", () => {
    const result = createPriceItemSchema.safeParse({
      category: "Equipo",
      description: "Sin sistema",
    });
    assert.strictEqual(result.success, false);
  });

  it("rechaza un payload sin description", () => {
    const result = createPriceItemSchema.safeParse({
      system: "CCTV",
    });
    assert.strictEqual(result.success, false);
  });

  it("rechaza un unitCost negativo", () => {
    const result = createPriceItemSchema.safeParse({
      system: "CCTV",
      category: "Equipo",
      description: "Costo negativo",
      unitCost: -10,
    });
    assert.strictEqual(result.success, false);
  });

  it("rechaza un performance negativo", () => {
    const result = createPriceItemSchema.safeParse({
      system: "CCTV",
      category: "Equipo",
      description: "Rendimiento negativo",
      performance: -1,
    });
    assert.strictEqual(result.success, false);
  });

  it("aplica defaults a campos opcionales faltantes", () => {
    const result = createPriceItemSchema.safeParse({
      system: "CCTV",
      category: "Equipo",
      description: "Mínimo viable",
    });
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.sku, "");
      assert.strictEqual(result.data.brand, "");
      assert.strictEqual(result.data.unit, "pza");
      assert.strictEqual(result.data.unitCost, 0);
      assert.strictEqual(result.data.performance, 0);
      assert.strictEqual(result.data.active, true);
    }
  });
});

describe("CRUD PriceItem (integración con SQLite)", () => {
  it("CREATE: inserta un ítem de prueba", async (t) => {
    if (!dbAvailable || !db) {
      t.skip();
      return;
    }
    const created = await db.priceItem.create({
      data: {
        sku: "TEST-CRUD-001",
        system: "CCTV",
        category: "Equipo",
        brand: "TestBrand",
        model: "TestModel",
        description: "Item de prueba CRUD",
        unit: "PZA",
        unitCost: 1234.56,
        performance: 0,
        active: true,
      },
    });
    assert.ok(created.id, "Debe devolver un id");
    assert.strictEqual(created.sku, "TEST-CRUD-001");
    assert.strictEqual(created.unitCost, 1234.56);
    testItemId = created.id;
  });

  it("READ: recupera el ítem por id", async (t) => {
    if (!dbAvailable || !db || !testItemId) {
      t.skip();
      return;
    }
    const found = await db.priceItem.findUnique({ where: { id: testItemId } });
    assert.ok(found, "Debe encontrar el ítem");
    assert.strictEqual(found?.sku, "TEST-CRUD-001");
  });

  it("UPDATE: modifica el unitCost", async (t) => {
    if (!dbAvailable || !db || !testItemId) {
      t.skip();
      return;
    }
    const updated = await db.priceItem.update({
      where: { id: testItemId },
      data: { unitCost: 9999.99 },
    });
    assert.strictEqual(updated.unitCost, 9999.99);
  });

  it("UPDATE: mantiene persistencia tras relectura", async (t) => {
    if (!dbAvailable || !db || !testItemId) {
      t.skip();
      return;
    }
    const found = await db.priceItem.findUnique({ where: { id: testItemId } });
    assert.strictEqual(found?.unitCost, 9999.99, "El cambio debe persistir en BD");
  });

  it("DELETE: elimina el ítem", async (t) => {
    if (!dbAvailable || !db || !testItemId) {
      t.skip();
      return;
    }
    await db.priceItem.delete({ where: { id: testItemId } });
    const found = await db.priceItem.findUnique({ where: { id: testItemId } });
    assert.strictEqual(found, null, "El ítem debe haber sido eliminado");
    testItemId = null; // ya no hay nada que limpiar
  });
});
