import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";

/**
 * Ruta para sembrar precios por defecto en la base de datos.
 *
 * Los datos se cargan dinámicamente desde un archivo JSON externo
 * (`src/lib/seed-data/default-prices.json`) en lugar de estar hardcodeados
 * en el código fuente, lo que facilita su mantenimiento y actualización sin
 * tocar el código TypeScript.
 *
 * Esta operación es idempotente: si la BD ya tiene precios, no hace nada.
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

/**
 * Carga y parsea el archivo JSON de seed desde el sistema de archivos.
 * Lanza un error descriptivo si el archivo no existe o es inválido.
 */
async function loadSeedFile(): Promise<SeedFile> {
  // Resolvemos la ruta en runtime para que funcione tanto en dev como en
  // build (process.cwd() = raíz del proyecto Next.js).
  const seedPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "seed-data",
    "default-prices.json",
  );
  const raw = await fs.readFile(seedPath, "utf-8");
  const data = JSON.parse(raw) as SeedFile;
  if (!data || !Array.isArray(data.items)) {
    throw new Error("El archivo de seed no contiene un array 'items' válido");
  }
  return data;
}

export async function POST() {
  try {
    const existing = await db.priceItem.count();
    if (existing > 0) {
      return NextResponse.json({
        message: "Database already has price items, skipping seed",
        existing,
      });
    }

    const seed = await loadSeedFile();
    const items = seed.items;

    // Normalizamos cada item para garantizar que los campos opcionales
    // queden como strings vacíos (no undefined) y los numéricos sean >= 0,
    // alineado con el schema Prisma.
    const normalized = items.map((it) => ({
      sku: String(it.sku ?? ""),
      system: String(it.system ?? "GENERAL"),
      category: String(it.category ?? "Equipo"),
      brand: String(it.brand ?? ""),
      model: String(it.model ?? ""),
      description: String(it.description ?? ""),
      unit: String(it.unit ?? "PZA"),
      unitCost: Number.isFinite(it.unitCost) && it.unitCost >= 0 ? it.unitCost : 0,
      performance:
        Number.isFinite(it.performance) && it.performance >= 0 ? it.performance : 0,
      deviceType: String(it.deviceType ?? ""),
      provider: "",
      certifications: "",
      datasheetUrl: "",
      notes: "",
      crewTechnician: 0,
      crewOfficer: 0,
      crewHelper: 0,
      laborHours: 0,
      active: true,
    }));

    // Inserción en bloque (más eficiente que un loop secuencial)
    const result = await db.priceItem.createMany({ data: normalized });

    return NextResponse.json({
      message: "Default price items seeded successfully",
      created: result.count,
      source: seed._meta?.source ?? "default-prices.json",
      version: seed._meta?.version ?? "unknown",
    });
  } catch (error) {
    console.error("Error seeding defaults:", error);
    return NextResponse.json(
      {
        error: "Failed to seed defaults",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
