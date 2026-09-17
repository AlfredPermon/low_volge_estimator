import { describe, it, before } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Tests del archivo JSON de seed de precios por defecto.
 *
 * Verifica que el archivo:
 *  - Existe y es parseable.
 *  - Contiene un array `items` con la estructura correcta.
 *  - Cada ítem tiene los campos mínimos requeridos.
 *  - Los SKUs son únicos.
 *  - Los sistemas y categorías pertenecen a los enums válidos.
 *  - Los costos numéricos son finitos y no negativos.
 */

interface SeedItem {
  sku: string;
  system: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  unit: string;
  unitCost: number;
  performance: number;
  deviceType: string;
}

interface SeedFile {
  _meta?: {
    description?: string;
    version?: string;
    lastUpdated?: string;
    source?: string;
  };
  items: SeedItem[];
}

const VALID_SYSTEMS = [
  "CCTV",
  "ACCESO",
  "VOCEO",
  "INCENDIO",
  "CANALIZACION",
  "CABLEADO",
  "GENERAL",
];

const VALID_CATEGORIES = [
  "Equipo",
  "Accesorio",
  "Consumible",
  "Mano de Obra",
  "Servicio",
];

let seed: SeedFile;

before(async () => {
  const seedPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "seed-data",
    "default-prices.json",
  );
  const raw = await fs.readFile(seedPath, "utf-8");
  seed = JSON.parse(raw) as SeedFile;
});

describe("seed-data/default-prices.json", () => {
  it("existe y es JSON válido", () => {
    assert.ok(seed, "El seed debe estar cargado");
    assert.ok(Array.isArray(seed.items), "items debe ser un array");
    assert.ok(seed.items.length > 0, "items no debe estar vacío");
  });

  it("contiene metadatos básicos", () => {
    assert.ok(seed._meta, "Debe existir _meta");
    assert.ok(typeof seed._meta?.description === "string");
    assert.ok(typeof seed._meta?.version === "string");
  });

  it("cada ítem tiene los campos mínimos requeridos", () => {
    for (const item of seed.items) {
      assert.ok(typeof item.sku === "string", `SKU debe ser string (${JSON.stringify(item)})`);
      assert.ok(item.system && typeof item.system === "string", "system es obligatorio");
      assert.ok(item.category && typeof item.category === "string", "category es obligatorio");
      assert.ok(typeof item.description === "string" && item.description.length > 0,
        "description es obligatorio");
      assert.ok(typeof item.unit === "string" && item.unit.length > 0, "unit es obligatorio");
    }
  });

  it("los SKUs son únicos", () => {
    const skus = new Set<string>();
    const duplicates: string[] = [];
    for (const item of seed.items) {
      if (!item.sku) continue;
      if (skus.has(item.sku)) {
        duplicates.push(item.sku);
      }
      skus.add(item.sku);
    }
    assert.deepStrictEqual(duplicates, [], `SKUs duplicados: ${duplicates.join(", ")}`);
  });

  it("todos los sistemas son válidos", () => {
    const invalid = seed.items
      .filter((it) => !VALID_SYSTEMS.includes(it.system))
      .map((it) => `${it.sku} → ${it.system}`);
    assert.deepStrictEqual(invalid, [], `Sistemas inválidos: ${invalid.join(", ")}`);
  });

  it("todas las categorías son válidas", () => {
    const invalid = seed.items
      .filter((it) => !VALID_CATEGORIES.includes(it.category))
      .map((it) => `${it.sku} → ${it.category}`);
    assert.deepStrictEqual(invalid, [], `Categorías inválidas: ${invalid.join(", ")}`);
  });

  it("los costos son numéricos, finitos y >= 0", () => {
    for (const item of seed.items) {
      assert.strictEqual(typeof item.unitCost, "number",
        `unitCost debe ser number en ${item.sku}`);
      assert.ok(Number.isFinite(item.unitCost),
        `unitCost debe ser finito en ${item.sku}`);
      assert.ok(item.unitCost >= 0,
        `unitCost debe ser >= 0 en ${item.sku} (era ${item.unitCost})`);
    }
  });

  it("los rendimientos son numéricos, finitos y >= 0", () => {
    for (const item of seed.items) {
      assert.strictEqual(typeof item.performance, "number",
        `performance debe ser number en ${item.sku}`);
      assert.ok(Number.isFinite(item.performance),
        `performance debe ser finito en ${item.sku}`);
      assert.ok(item.performance >= 0,
        `performance debe ser >= 0 en ${item.sku}`);
    }
  });

  it("cubre todos los sistemas esperados", () => {
    const systems = new Set(seed.items.map((it) => it.system));
    for (const s of VALID_SYSTEMS) {
      assert.ok(systems.has(s), `Faltan ítems para el sistema ${s}`);
    }
  });

  it("incluye al menos un ítem de mano de obra por sistema principal", () => {
    const laborItems = seed.items.filter((it) => it.category === "Mano de Obra");
    assert.ok(laborItems.length >= 4,
      `Debe haber al menos 4 ítems de mano de obra (CCTV, ACCESO, VOCEO, INCENDIO). Encontrados: ${laborItems.length}`);
  });

  it("los ítems de mano de obra tienen performance > 0", () => {
    const laborItems = seed.items.filter((it) => it.category === "Mano de Obra");
    for (const it of laborItems) {
      assert.ok(it.performance > 0,
        `Mano de obra ${it.sku} debe tener rendimiento > 0 (era ${it.performance})`);
    }
  });
});
