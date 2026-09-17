import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { z } from "zod";
import { SYSTEMS, CATEGORIES, DEVICE_TYPES } from "@/lib/constants";
import { isCanonicalUnit } from "@/lib/unit-normalizer";
import {
  normalizeSystemName,
  normalizeCategoryName,
  normalizeUnitName,
} from "@/lib/import-normalizer";

// ─── Zod Schema for Row Validation ───────────────────────────────────────────

const priceRowSchema = z.object({
  SKU: z.string().min(1, "El SKU es obligatorio"),
  Sistema: z.enum(SYSTEMS as unknown as [string, ...string[]], {
    message: "Sistema inválido",
  }),
  Categoría: z.enum(CATEGORIES as unknown as [string, ...string[]], {
    message: "Categoría inválida",
  }),
  Marca: z.string().default(""),
  Modelo: z.string().default(""),
  Descripción: z.string().min(1, "La descripción es obligatoria"),
  Unidad: z.string().min(1, "La unidad es obligatoria"),
  Costo: z
    .number({
      message: "El costo debe ser un número",
    })
    .min(0, "El costo no puede ser negativo"),
  Rendimiento: z.number().default(0),
  TipoDispositivo: z.enum(DEVICE_TYPES as unknown as [string, ...string[]]).or(z.literal("")),
});

// ─── Types ─────────────────────────────────────────────────────────────────

interface RowError {
  row: number;
  errors: string[];
  /** Datos crudos de la fila para mostrar en el reporte. */
  raw?: Record<string, unknown>;
}

interface ImportReport {
  total: number;
  imported: number;
  failed: number;
  errors: RowError[];
  warnings: string[];
  duplicatesInFile: string[];
  unknownUnits: string[];
  unknownSystems: string[];
  unknownCategories: string[];
  refErrors: number;
  durationMs: number;
}

// ─── Constantes de validación (TASK §18.5, F1) ────────────────────────────

/** Patrones de error de Excel que indican fórmulas rotas. */
const REF_ERROR_PATTERNS = [
  "#REF!",
  "#NAME?",
  "#VALUE!",
  "#DIV/0!",
  "#N/A",
  "#NUM!",
  "#NULL!",
];

function looksLikeRefError(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return REF_ERROR_PATTERNS.some((p) => v.includes(p));
}

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ── Detección del tipo de archivo ────────────────────────────────────────
    // Si el archivo es .json usamos JSON.parse en lugar de XLSX para construir
    // el mismo array rows[] que el pipeline de validación ya procesa.
    // La lógica de validación, normalización e inserción es IDÉNTICA para ambos
    // formatos — no se duplica ningún código.
    const isJson =
      file.name.toLowerCase().endsWith(".json") ||
      file.type === "application/json";

    let rows: Record<string, unknown>[];

    if (isJson) {
      // ── Rama JSON ────────────────────────────────────────────────────────
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { error: "El archivo JSON no es válido. Verifique que el contenido sea JSON bien formado." },
          { status: 400 }
        );
      }

      // Acepta dos formas:
      //   1. Array directo: [{SKU, Sistema, ...}, ...]
      //   2. Envelope del exportador: {data: [{SKU, Sistema, ...}, ...], ...}
      if (Array.isArray(parsed)) {
        rows = parsed as Record<string, unknown>[];
      } else if (
        parsed !== null &&
        typeof parsed === "object" &&
        Array.isArray((parsed as Record<string, unknown>).data)
      ) {
        rows = (parsed as { data: Record<string, unknown>[] }).data;
      } else {
        return NextResponse.json(
          {
            error:
              "Estructura JSON no reconocida. El archivo debe ser un array de objetos o tener la forma {data: [...]}.",
          },
          { status: 400 }
        );
      }

      if (rows.length === 0) {
        return NextResponse.json({ error: "El archivo JSON está vacío" }, { status: 400 });
      }
    } else {
      // ── Rama Excel / CSV (comportamiento original) ────────────────────────
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (rows.length === 0) {
        return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
      }
    }

    // F1 - Validación enriquecida con reporte
    const priceItemsToInsert: any[] = [];
    const errors: RowError[] = [];
    const warnings: string[] = [];
    const skusSeen = new Set<string>();
    const duplicatesInFile: string[] = [];
    const unknownUnits = new Set<string>();
    const unknownSystems = new Set<string>();
    const unknownCategories = new Set<string>();
    let refErrors = 0;
    let normalizedSystems = 0;
    let normalizedCategories = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +1 header, +1 0-index

      // Detección temprana de errores de fórmula Excel (#REF!, #NAME?, etc.)
      const hasRefError = REF_ERROR_PATTERNS.some((p) =>
        Object.values(row).some((v) => typeof v === "string" && v.includes(p))
      );
      if (hasRefError) {
        refErrors++;
        errors.push({
          row: rowNumber,
          errors: ["La fila contiene errores de fórmula Excel (#REF!, #NAME?, etc.)"],
          raw: row,
        });
        continue;
      }

      // Saltar filas completamente vacías
      if (!row.SKU && !row.Descripción && row.Costo === "") continue;

      // F1 - Detección de SKU duplicado dentro del archivo
      const sku = String(row.SKU || "").trim();
      if (sku) {
        if (skusSeen.has(sku)) {
          duplicatesInFile.push(sku);
          errors.push({
            row: rowNumber,
            errors: [`SKU duplicado en el archivo: "${sku}"`],
            raw: row,
          });
          continue;
        }
        skusSeen.add(sku);
      }

      // F1 - Normalizar Sistema a clave canónica del enum SYSTEMS.
      // Si no se reconoce, se acepta la fila con fallback "GENERAL" + warning
      // (antes esto abortaba 36 filas de golpe, lo que es excesivo).
      const rawSystem = String(row.Sistema || "").trim();
      const normalizedSystem = normalizeSystemName(rawSystem, SYSTEMS);
      let finalSystem: string;
      if (normalizedSystem) {
        if (normalizedSystem !== rawSystem) normalizedSystems++;
        finalSystem = normalizedSystem;
      } else {
        unknownSystems.add(rawSystem || "(vacío)");
        warnings.push(
          `Fila ${rowNumber}: sistema "${rawSystem || "(vacío)"}" no reconocido. Se asigna "GENERAL" y se recomienda revisarlo.`
        );
        finalSystem = "GENERAL";
      }

      // F1 - Normalizar Categoría a clave canónica.
      const rawCategory = String(row.Categoría || "").trim();
      const normalizedCategory = normalizeCategoryName(rawCategory, CATEGORIES);
      let finalCategory: string;
      if (normalizedCategory) {
        if (normalizedCategory !== rawCategory) normalizedCategories++;
        finalCategory = normalizedCategory;
      } else {
        unknownCategories.add(rawCategory || "(vacío)");
        warnings.push(
          `Fila ${rowNumber}: categoría "${rawCategory || "(vacío)"}" no reconocida. Se asigna "Equipo" como fallback.`
        );
        finalCategory = "Equipo";
      }

      // F1 - Normalizar Unidad a forma canónica.
      const rawUnit = String(row.Unidad || "").trim();
      const finalUnit = normalizeUnitName(rawUnit);

      const parseResult = priceRowSchema.safeParse({
        SKU: sku,
        Sistema: finalSystem,
        Categoría: finalCategory,
        Marca: String(row.Marca || "").trim(),
        Modelo: String(row.Modelo || "").trim(),
        Descripción: String(row.Descripción || "").trim(),
        Unidad: finalUnit,
        Costo: typeof row.Costo === "number" ? row.Costo : parseFloat(String(row.Costo || 0)),
        Rendimiento:
          typeof row.Rendimiento === "number"
            ? row.Rendimiento
            : parseFloat(String(row.Rendimiento || 0)),
        TipoDispositivo: String(row.TipoDispositivo || "").trim(),
      });

      if (!parseResult.success) {
        errors.push({
          row: rowNumber,
          errors: parseResult.error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`
          ),
          raw: row,
        });
        continue;
      }

      // F1 - Validar unidad canónica
      const unidad = parseResult.data.Unidad;
      if (!isCanonicalUnit(unidad)) {
        unknownUnits.add(unidad);
        warnings.push(
          `Fila ${rowNumber}: unidad "${unidad}" no es canónica. Se acepta pero se recomienda usar ${["ML", "PZA", "LOTE", "SERV", "ROLLO", "KG", "M2", "M3"].join(", ")}.`
        );
      }

      const data = parseResult.data;
      priceItemsToInsert.push({
        sku: data.SKU,
        system: data.Sistema,
        category: data.Categoría,
        brand: data.Marca,
        model: data.Modelo,
        description: data.Descripción,
        unit: data.Unidad,
        unitCost: data.Costo,
        performance: data.Rendimiento,
        deviceType: data.TipoDispositivo,
        active: true,
      });
    }

    // F1 - Si no hay nada válido para importar, devolver 400
    if (priceItemsToInsert.length === 0) {
      return NextResponse.json(
        {
          error: "No se encontraron filas válidas para importar",
          report: {
            total: rows.length,
            imported: 0,
            failed: errors.length,
            errors: errors.slice(0, 50),
            warnings,
            duplicatesInFile,
            unknownUnits: Array.from(unknownUnits),
            unknownSystems: Array.from(unknownSystems),
            unknownCategories: Array.from(unknownCategories),
            refErrors,
            durationMs: Date.now() - start,
          } satisfies ImportReport,
        },
        { status: 400 }
      );
    }

    // Transacción: reemplaza todos los precios de forma atómica
    await db.$transaction([
      db.priceItem.deleteMany({}),
      db.priceItem.createMany({ data: priceItemsToInsert }),
    ]);

    // Resumen de normalizaciones aplicadas (no son errores, son ayudas).
    if (normalizedSystems > 0) {
      warnings.unshift(
        `ℹ️ ${normalizedSystems} filas normalizadas automáticamente en la columna "Sistema" (sinónimos, acentos o mayúsculas).`
      );
    }
    if (normalizedCategories > 0) {
      warnings.unshift(
        `ℹ️ ${normalizedCategories} filas normalizadas automáticamente en la columna "Categoría".`
      );
    }
    if (unknownSystems.size > 0) {
      warnings.unshift(
        `⚠️ ${unknownSystems.size} valor(es) de "Sistema" no reconocidos (asignados a "GENERAL"): ${Array.from(unknownSystems).join(", ")}`
      );
    }
    if (unknownCategories.size > 0) {
      warnings.unshift(
        `⚠️ ${unknownCategories.size} valor(es) de "Categoría" no reconocidos (asignados a "Equipo"): ${Array.from(unknownCategories).join(", ")}`
      );
    }

    const report: ImportReport = {
      total: rows.length,
      imported: priceItemsToInsert.length,
      failed: errors.length,
      errors: errors.slice(0, 50),
      warnings,
      duplicatesInFile: Array.from(new Set(duplicatesInFile)),
      unknownUnits: Array.from(unknownUnits),
      unknownSystems: Array.from(unknownSystems),
      unknownCategories: Array.from(unknownCategories),
      refErrors,
      durationMs: Date.now() - start,
    };

    return NextResponse.json({ imported: report.imported, report });
  } catch (error) {
    console.error("Error importing Excel:", error);
    return NextResponse.json(
      { error: "Fallo al importar el archivo Excel", details: String(error) },
      { status: 500 }
    );
  }
}
