import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { z } from "zod";

// ─── Helpers for auto-detection ────────────────────────────────────────────

function detectSystem(concept: string, section: string): string {
  const text = `${concept} ${section}`.toLowerCase();

  // Order matters: more specific first
  if (/voceo|altavoz|amplificador/.test(text)) return "VOCEO";
  if (/cámara|camera|nvr|grabador/.test(text)) return "CCTV";
  if (/acceso|torniquete|lector|reconocimiento facial|chapa|magnética/.test(text)) return "ACCESO";
  if (/incendio|detector de humo|estación manual|estrobo|hochiki/.test(text)) return "INCENDIO";
  if (/conduit|canalización|soporte|caja|cople|conector|fittings/.test(text)) return "CANALIZACION";
  if (/cable|utp|fplr/.test(text)) return "CABLEADO";
  if (/puesta en marcha|capacitación|planos/.test(text)) return "GENERAL";

  return "GENERAL";
}

function detectCategory(concept: string): string {
  const lower = concept.toLowerCase();
  if (/mano de obra|instalación/.test(lower)) return "Mano de Obra";
  if (/puesta en marcha|capacitación|planos/.test(lower)) return "Servicio";
  return "Equipo";
}

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  if (/^(ml|m\.l\.|mts|metro lineal)$/.test(lower)) return "ml";
  if (/^(pza|pieza|pieza\.?)$/.test(lower)) return "pza";
  if (lower === "lote") return "lote";
  if (/^(kg|kilo)$/.test(lower)) return "kg";
  if (/^(rollo|rollos)$/.test(lower)) return "rollo";
  if (/^(servicio|srv)$/.test(lower)) return "servicio";
  if (lower === "juego" || lower === "jgo") return "juego";
  if (lower === "par" || lower === "par ") return "par";
  return lower || "pza";
}

function extractBrandModel(concept: string): { brand: string; model: string } {
  const text = concept;
  let brand = "";
  let model = "";

  // Try "marca X modelo Y" pattern
  const marcaMatch = text.match(/marca\s+([^\s,]+)/i);
  const modeloMatch = text.match(/modelo\s+([^\s,]+)/i);

  if (marcaMatch) brand = marcaMatch[1];
  if (modeloMatch) model = modeloMatch[1];

  // Try to find brand names in the description
  const knownBrands = [
    "Hikvision", "Dahua", "Bosch", "Honeywell", "Axis",
    "Vivotek", "Uniview", "Samsung", "Sony", "Pelco",
    "Genetec", "Milestones", "HID", "Suprema", "ZKTeco",
    "Bosch", "Notifix", "EDM", "Legrand", "Cousse",
    "Panduit", "CommScope", "Belden", "General Cable",
    "Thomas & Betts", "Cooper", "Eaton", "Schneider",
    "Hochiki", "Notifier", "Simplex", "Edwards",
    "Festej", "Megacable", "Ryder", "Steren",
  ];

  if (!brand) {
    for (const b of knownBrands) {
      if (text.toLowerCase().includes(b.toLowerCase())) {
        brand = b;
        break;
      }
    }
  }

  return { brand, model };
}

// ─── POST handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    // Detect header row: find the row that has "Código" in column A or "Concepto" in column B
    let startRow = 0;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      const keys = Object.keys(row);
      for (const key of keys) {
        if (/código|codigo|code/i.test(key) || /concepto|concept/i.test(key)) {
          startRow = i + 1; // data starts after this row
          break;
        }
      }
      if (startRow > 0) break;
    }

    const priceItems: {
      sku: string;
      system: string;
      category: string;
      brand: string;
      model: string;
      description: string;
      unit: string;
      unitCost: number;
      performance: number;
    }[] = [];

    // Track current section from section headers
    let currentSection = "";

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      const keys = Object.keys(row);

      // The columns should map to: A=Código, B=Concepto, C=Frente/Section, D=Unidad, E=Cantidad, F=Precio Unitario, G=Importe
      // But Excel keys could be the header text or column letters
      const getValue = (index: number): string => {
        if (index < keys.length) return String(row[keys[index]] ?? "").trim();
        return "";
      };

      const codigo = getValue(0);
      const concepto = getValue(1);
      const frente = getValue(2);
      const unidad = getValue(3);
      const cantidadStr = getValue(4);
      const precioStr = getValue(5);
      const importeStr = getValue(6);

      // Skip empty rows
      if (!concepto && !codigo) continue;

      // Detect section from row
      if (frente && !codigo && !precioStr) {
        currentSection = frente;
        continue;
      }

      // Parse price - handle various formats
      let price = 0;
      const priceClean = precioStr.replace(/[$,]/g, "").replace(/\s/g, "");
      const priceNum = parseFloat(priceClean);
      if (!isNaN(priceNum)) price = priceNum;

      // Skip rows without prices
      if (price === 0 || price === null || isNaN(price)) continue;

      const concept = concepto || codigo;
      const system = detectSystem(concept, frente || currentSection);
      const category = detectCategory(concept);
      const { brand, model } = extractBrandModel(concept);
      const unit = normalizeUnit(unidad);

      priceItems.push({
        sku: codigo || "",
        system,
        category,
        brand,
        model,
        description: concept,
        unit,
        unitCost: price,
        performance: 0,
      });
    }

    // Delete all existing and insert new
    await db.priceItem.deleteMany({});

    let imported = 0;
    for (const item of priceItems) {
      await db.priceItem.create({ data: item });
      imported++;
    }

    return NextResponse.json({ imported, total: priceItems.length });
  } catch (error) {
    console.error("Error importing Excel:", error);
    return NextResponse.json(
      { error: "Failed to import Excel file", details: String(error) },
      { status: 500 }
    );
  }
}