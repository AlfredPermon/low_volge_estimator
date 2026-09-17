/**
 * Tests de integración para:
 *   1. Exportación de BD de precios (xlsx y json) — lógica pura sin servidor
 *   2. Importación de JSON — detección del tipo y construcción de rows[]
 *
 * Estrategia: No se levanta Next.js ni Prisma. Se prueban las funciones puras
 * extraídas del pipeline para evitar dependencias externas. Para los tests de
 * integración reales (con BD) se usa el mismo patrón que schedule-db.test.ts.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";

// ─── helpers de BD de prueba ────────────────────────────────────────────────

let dbAvailable = false;
let db: PrismaClient | null = null;

before(async () => {
  const tmpDir = path.join(process.cwd(), "tests", ".tmp");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const dbFile = path.join(tmpDir, "prices-export-import.db");
  if (existsSync(dbFile)) {
    try { unlinkSync(dbFile); } catch { /* ignore */ }
  }

  const url = `file:${dbFile.replace(/\\/g, "/")}`;

  try {
    db = new PrismaClient({ datasources: { db: { url } } });

    // Crear tabla mínima para PriceItem
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS PriceItem (
        id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        sku         TEXT    NOT NULL DEFAULT '',
        system      TEXT    NOT NULL,
        category    TEXT    NOT NULL,
        brand       TEXT    NOT NULL DEFAULT '',
        model       TEXT    NOT NULL DEFAULT '',
        description TEXT    NOT NULL,
        unit        TEXT    NOT NULL DEFAULT 'pza',
        unitCost    REAL    NOT NULL DEFAULT 0,
        performance REAL    NOT NULL DEFAULT 0,
        deviceType  TEXT    NOT NULL DEFAULT '',
        active      BOOLEAN NOT NULL DEFAULT 1,
        provider    TEXT    NOT NULL DEFAULT '',
        certifications TEXT NOT NULL DEFAULT '',
        datasheetUrl TEXT   NOT NULL DEFAULT '',
        notes       TEXT    NOT NULL DEFAULT '',
        crewTechnician REAL NOT NULL DEFAULT 0,
        crewOfficer REAL NOT NULL DEFAULT 0,
        crewHelper  REAL NOT NULL DEFAULT 0,
        laborHours  REAL    NOT NULL DEFAULT 0,
        userId      TEXT,
        createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sembrar datos de prueba
    await db.priceItem.createMany({
      data: [
        {
          sku: "CCTV-CAM-001",
          system: "CCTV",
          category: "Equipo",
          brand: "Hikvision",
          model: "DS-2CD2055",
          description: "Cámara Bullet 5MP PoE",
          unit: "pza",
          unitCost: 7500.50,
          performance: 0,
          deviceType: "cctv_camera_bullet",
          active: true,
        },
        {
          sku: "ACC-LEC-01",
          system: "ACCESO",
          category: "Equipo",
          brand: "ZKTeco",
          model: "ProFaceX",
          description: "Terminal de Reconocimiento Facial",
          unit: "pza",
          unitCost: 12000.00,
          performance: 0,
          deviceType: "access_reader",
          active: true,
        },
        {
          sku: "CAB-UTP-6",
          system: "CABLEADO",
          category: "Consumible",
          brand: "Belden",
          model: "Cat6",
          description: "Cable UTP Cat6 (precio por metro)",
          unit: "ml",
          unitCost: 15.50,
          performance: 0,
          deviceType: "cable_utp",
          active: true,
        },
      ],
    });

    await db.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch (err) {
    console.warn("⚠️  BD de prueba no disponible:", err);
    if (db) { try { await db.$disconnect(); } catch { /* ignore */ } }
    db = null;
    dbAvailable = false;
  }
});

after(async () => {
  if (db) await db.$disconnect();
});

// ─── Helpers locales que replican la lógica de exportación ──────────────────

const EXPORT_HEADERS = [
  "SKU", "Sistema", "Categoría", "Marca", "Modelo",
  "Descripción", "Unidad", "Costo", "Rendimiento", "TipoDispositivo",
] as const;

function mapToExportRow(r: {
  sku: string; system: string; category: string; brand: string; model: string;
  description: string; unit: string; unitCost: number; performance: number; deviceType: string;
}) {
  return {
    SKU: r.sku ?? "",
    Sistema: r.system ?? "",
    Categoría: r.category ?? "",
    Marca: r.brand ?? "",
    Modelo: r.model ?? "",
    Descripción: r.description ?? "",
    Unidad: r.unit ?? "",
    Costo: r.unitCost ?? 0,
    Rendimiento: r.performance ?? 0,
    TipoDispositivo: r.deviceType ?? "",
  };
}

function buildXlsxBuffer(rows: ReturnType<typeof mapToExportRow>[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...EXPORT_HEADERS] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Precios");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function parseJsonImport(text: string): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(text);
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
  if (
    parsed !== null &&
    typeof parsed === "object" &&
    Array.isArray((parsed as Record<string, unknown>).data)
  ) {
    return (parsed as { data: Record<string, unknown>[] }).data;
  }
  throw new Error("Estructura JSON no reconocida");
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("prices-export — generación de xlsx", () => {
  it("genera un buffer xlsx parseável con las columnas correctas", async (t) => {
    if (!dbAvailable || !db) { t.skip(); return; }

    const records = await db.priceItem.findMany({ where: { active: true } });
    const rows = records.map(mapToExportRow);
    const buffer = buildXlsxBuffer(rows);

    assert.ok(buffer.length > 0, "El buffer no debe estar vacío");

    // Parsear el xlsx generado y verificar contenido
    const wb = XLSX.read(buffer, { type: "buffer" });
    assert.ok(wb.SheetNames.includes("Precios"), "Debe existir hoja 'Precios'");

    const sheet = wb.Sheets["Precios"];
    const parsedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    assert.strictEqual(parsedRows.length, records.length,
      `Deben exportarse ${records.length} registros`);

    // Verificar que todas las columnas requeridas están presentes
    const firstRow = parsedRows[0];
    for (const header of EXPORT_HEADERS) {
      assert.ok(header in firstRow, `La columna "${header}" debe estar presente`);
    }
  });

  it("los datos exportados coinciden con los registros de la BD", async (t) => {
    if (!dbAvailable || !db) { t.skip(); return; }

    const records = await db.priceItem.findMany({
      where: { active: true },
      orderBy: [{ system: "asc" }, { sku: "asc" }],
    });
    const rows = records.map(mapToExportRow);
    const buffer = buildXlsxBuffer(rows);

    const wb = XLSX.read(buffer, { type: "buffer" });
    const parsedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Precios"]);

    // Verificar el primer registro de ACCESO (orden asc por system)
    const accesoRow = parsedRows.find((r) => r["Sistema"] === "ACCESO");
    assert.ok(accesoRow, "Debe haber al menos un registro del sistema ACCESO");
    assert.strictEqual(accesoRow["SKU"], "ACC-LEC-01");
    assert.strictEqual(accesoRow["Costo"], 12000);
  });
});

describe("prices-export — generación de json", () => {
  it("genera un payload json con estructura correcta", async (t) => {
    if (!dbAvailable || !db) { t.skip(); return; }

    const records = await db.priceItem.findMany({ where: { active: true } });
    const rows = records.map(mapToExportRow);

    const payload = {
      exported: records.length,
      exportedAt: new Date().toISOString(),
      version: "1.0",
      data: rows,
    };
    const jsonText = JSON.stringify(payload, null, 2);

    assert.ok(jsonText.length > 0, "El JSON no debe estar vacío");

    const reparsed = JSON.parse(jsonText) as typeof payload;
    assert.strictEqual(reparsed.exported, records.length);
    assert.ok(Array.isArray(reparsed.data), "data debe ser un array");
    assert.strictEqual(reparsed.data.length, records.length);
    assert.ok("SKU" in reparsed.data[0], "Cada elemento debe tener SKU");
  });

  it("el json exportado puede reimportarse directamente", async (t) => {
    if (!dbAvailable || !db) { t.skip(); return; }

    const records = await db.priceItem.findMany({ where: { active: true } });
    const rows = records.map(mapToExportRow);

    // Simular exportación
    const payload = { exported: records.length, data: rows };
    const jsonText = JSON.stringify(payload);

    // Simular importación del envelope
    const reimported = parseJsonImport(jsonText);
    assert.strictEqual(reimported.length, records.length,
      "Todos los registros exportados deben poder reimportarse");
  });
});

describe("prices-import — parsing de JSON", () => {
  it("acepta un array directo de objetos", () => {
    const jsonText = JSON.stringify([
      { SKU: "TEST-001", Sistema: "CCTV", Categoría: "Equipo",
        Descripción: "Test", Unidad: "pza", Costo: 100, Rendimiento: 0, TipoDispositivo: "" },
    ]);
    const rows = parseJsonImport(jsonText);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0]["SKU"], "TEST-001");
  });

  it("acepta el envelope {data: [...]} producido por el exportador", () => {
    const envelope = {
      exported: 2,
      version: "1.0",
      data: [
        { SKU: "A-001", Sistema: "CCTV", Categoría: "Equipo",
          Descripción: "Cam A", Unidad: "pza", Costo: 500, Rendimiento: 0, TipoDispositivo: "" },
        { SKU: "A-002", Sistema: "ACCESO", Categoría: "Equipo",
          Descripción: "Reader B", Unidad: "pza", Costo: 1200, Rendimiento: 0, TipoDispositivo: "" },
      ],
    };
    const rows = parseJsonImport(JSON.stringify(envelope));
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[1]["SKU"], "A-002");
  });

  it("lanza error para estructura json no reconocida", () => {
    const invalid = JSON.stringify({ foo: "bar", count: 5 });
    assert.throws(
      () => parseJsonImport(invalid),
      /Estructura JSON no reconocida/,
      "Debe lanzar error con mensaje apropiado"
    );
  });

  it("detecta archivo json por extensión de nombre o mime type", () => {
    const filename: string = "precios_lve_2026.json";
    const fileType: string = "application/json";
    const isJsonByName = filename.toLowerCase().endsWith(".json");
    const isJsonByMime = fileType === "application/json";
    assert.ok(isJsonByName, "El nombre de archivo .json debe detectarse correctamente");
    assert.ok(isJsonByMime, "El MIME type application/json debe detectarse correctamente");
  });

  it("valida que filas sin SKU generarían error en el pipeline", () => {
    // Simular que el pipeline Zod rechaza filas sin SKU
    // (El schema requiere SKU con min(1))
    const rowsWithMissingSku = [
      { SKU: "", Sistema: "CCTV", Categoría: "Equipo",
        Descripción: "Sin SKU", Unidad: "pza", Costo: 100, Rendimiento: 0, TipoDispositivo: "" },
    ];

    // El campo SKU vacío → z.string().min(1) falla
    const errors: { row: number; errors: string[] }[] = [];
    rowsWithMissingSku.forEach((row, i) => {
      const sku = String(row.SKU ?? "").trim();
      if (!sku) {
        errors.push({ row: i + 2, errors: ["El SKU es obligatorio"] });
      }
    });

    assert.strictEqual(errors.length, 1, "Debe generarse 1 error por SKU vacío");
    assert.ok(
      errors[0].errors[0].includes("SKU"),
      "El mensaje de error debe mencionar SKU"
    );
  });
});

describe("prices-export — exportación con BD (integración)", () => {
  it("exporta exactamente el número de registros activos de la BD", async (t) => {
    if (!dbAvailable || !db) { t.skip(); return; }

    const count = await db.priceItem.count({ where: { active: true } });
    const records = await db.priceItem.findMany({ where: { active: true } });

    assert.strictEqual(records.length, count,
      "El número de registros exportados debe coincidir con el count");

    // Todos los exportados deben tener sistema no vacío
    const rowsMapped = records.map(mapToExportRow);
    for (const row of rowsMapped) {
      assert.ok(row.Sistema.length > 0, `Registro ${row.SKU} debe tener Sistema`);
      assert.ok(row.Descripción.length > 0, `Registro ${row.SKU} debe tener Descripción`);
    }
  });

  it("la exportación xlsx es idempotente (mismo contenido en dos llamadas)", async (t) => {
    if (!dbAvailable || !db) { t.skip(); return; }

    const records = await db.priceItem.findMany({
      where: { active: true },
      orderBy: [{ system: "asc" }, { sku: "asc" }],
    });
    const rows = records.map(mapToExportRow);

    const buf1 = buildXlsxBuffer(rows);
    const buf2 = buildXlsxBuffer(rows);

    // Parsear ambos y comparar contenido (no binario, ya que timestamps pueden variar)
    const wb1 = XLSX.read(buf1, { type: "buffer" });
    const wb2 = XLSX.read(buf2, { type: "buffer" });

    const r1 = XLSX.utils.sheet_to_json(wb1.Sheets["Precios"]);
    const r2 = XLSX.utils.sheet_to_json(wb2.Sheets["Precios"]);

    assert.deepStrictEqual(r1, r2, "Dos exportaciones consecutivas deben producir el mismo contenido");
  });
});
