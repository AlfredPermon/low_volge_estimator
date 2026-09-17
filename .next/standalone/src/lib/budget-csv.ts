import type { LineItem } from "@/store/estimate-store";
import { filterLineItemsForExport } from "./export-filters";

function formatQty(value: number | null | undefined): string {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return safe.toFixed(2);
}

function getSystemDisplayName(system: string): string {
  const names: Record<string, string> = {
    CCTV: "CCTV — Videovigilancia",
    ACCESO: "Control de Acceso",
    VOCEO: "Sistema de Voceo / PA",
    INCENDIO: "Detección y Alarma contra Incendio",
    CANALIZACION: "Canalización",
    CABLEADO: "Cableado Estructurado",
    GENERAL: "Generales y Servicios",
  };
  return names[system] ?? system;
}

export function buildBudgetCsvContent(params: {
  lineItems: LineItem[];
  currency: "MXN" | "USD";
  result: {
    subtotalDirect: number;
    subtotalIndirects: number;
    subtotalUtility: number;
    grandTotal: number;
    iva: number;
    totalWithIva: number;
  };
  meta: {
    name: string;
    clientName: string;
    projectName: string;
  };
  notes: string;
  factorsNotes: string;
}): string {
  const currencyLabel = params.currency === "MXN" ? "MXN" : "USD";
  const exportItems = filterLineItemsForExport(params.lineItems);
  const rows: string[][] = [];

  rows.push(["Presupuesto de Baja Tensión"]);
  rows.push([`Nombre: ${params.meta.name}`]);
  rows.push([`Cliente: ${params.meta.clientName || "—"}`]);
  rows.push([`Proyecto: ${params.meta.projectName || "—"}`]);
  rows.push([`Moneda: ${currencyLabel}`]);
  rows.push([]);

  rows.push([
    "ID",
    "Partida",
    "Código",
    "Descripción",
    "Sistema",
    "Categoría",
    "Unidad",
    "Cantidad",
    "P.U.",
    "Importe",
  ]);

  const systemOrder = [
    "CCTV",
    "ACCESO",
    "VOCEO",
    "INCENDIO",
    "CANALIZACION",
    "CABLEADO",
    "GENERAL",
  ];
  const grouped = new Map<string, LineItem[]>();
  for (const item of exportItems) {
    const list = grouped.get(item.system) ?? [];
    list.push(item);
    grouped.set(item.system, list);
  }

  for (const system of systemOrder) {
    const items = grouped.get(system);
    if (!items || items.length === 0) continue;

    rows.push([getSystemDisplayName(system)]);

    for (const item of items) {
      rows.push([
        item.id,
        item.partida,
        item.code,
        item.description,
        item.system,
        item.category,
        item.unit,
        formatQty(item.quantity),
        (item.unitCost ?? 0).toFixed(2),
        (item.total ?? 0).toFixed(2),
      ]);
    }

    const subtotal = items.reduce((sum, it) => sum + (it.total ?? 0), 0);
    rows.push(["", "", "", `Subtotal ${system}`, "", "", "", "", "", subtotal.toFixed(2)]);
    rows.push([]);
  }

  rows.push([]);
  rows.push(["RESUMEN DE TOTALES"]);
  rows.push([
    "Subtotal Directo (Materiales + Mano de Obra)",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    (params.result.subtotalDirect ?? 0).toFixed(2),
  ]);
  rows.push(["Costos Indirectos", "", "", "", "", "", "", "", "", (params.result.subtotalIndirects ?? 0).toFixed(2)]);
  rows.push(["Utilidad", "", "", "", "", "", "", "", "", (params.result.subtotalUtility ?? 0).toFixed(2)]);
  rows.push(["GRAN TOTAL (sin IVA)", "", "", "", "", "", "", "", "", (params.result.grandTotal ?? 0).toFixed(2)]);
  rows.push(["IVA", "", "", "", "", "", "", "", "", (params.result.iva ?? 0).toFixed(2)]);
  rows.push(["TOTAL CON IVA", "", "", "", "", "", "", "", "", (params.result.totalWithIva ?? 0).toFixed(2)]);

  const combinedNotes = [String(params.factorsNotes || "").trim(), String(params.notes || "").trim()]
    .filter(Boolean)
    .join("\n\n");
  if (combinedNotes) {
    rows.push([]);
    rows.push(["NOTAS ADICIONALES"]);
    combinedNotes.split("\n").forEach((line) => rows.push([line]));
  }

  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const escaped = String(cell).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
    .join("\r\n");

  const BOM = "\uFEFF";
  return BOM + csvContent;
}

