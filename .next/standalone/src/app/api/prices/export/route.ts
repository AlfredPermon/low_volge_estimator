import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db, ensureDatabaseSchema } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// ─── GET /api/prices/export?format=xlsx|json ──────────────────────────────────
//
// Descarga la base de datos completa de precios (todos los registros activos,
// sin paginación) en el formato solicitado.
//
// Columnas exportadas (idénticas a la plantilla de importación):
//   SKU | Sistema | Categoría | Marca | Modelo | Descripción |
//   Unidad | Costo | Rendimiento | TipoDispositivo
//
// De esta forma el archivo exportado puede reimportarse directamente sin
// modificaciones, garantizando compatibilidad total con la plantilla.

const EXPORT_HEADERS = [
  "SKU",
  "Sistema",
  "Categoría",
  "Marca",
  "Modelo",
  "Descripción",
  "Unidad",
  "Costo",
  "Rendimiento",
  "TipoDispositivo",
] as const;

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") ?? "xlsx").toLowerCase();

    if (format !== "xlsx" && format !== "json") {
      return NextResponse.json(
        { error: 'Formato no soportado. Use ?format=xlsx o ?format=json' },
        { status: 400 }
      );
    }

    // Obtener TODOS los registros activos (sin paginación)
    const records = await db.priceItem.findMany({
      where: { active: true },
      orderBy: [{ system: "asc" }, { sku: "asc" }],
    });

    // ── Mapeo al formato de exportación (mismas columnas que la plantilla) ──
    const rows = records.map((r) => ({
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
    }));

    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-");

    // ── Exportar como XLSX ──────────────────────────────────────────────────
    if (format === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: [...EXPORT_HEADERS],
      });

      // Anchos de columna (mismos que la plantilla)
      const colWidths = EXPORT_HEADERS.map(() => ({ wch: 20 }));
      colWidths[5] = { wch: 45 }; // Descripción más ancha
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Precios");

      // Segunda hoja con metadatos de la exportación
      const metaSheet = XLSX.utils.json_to_sheet([
        { Campo: "Total registros", Valor: records.length },
        { Campo: "Fecha exportación", Valor: new Date().toISOString() },
        {
          Campo: "Instrucciones",
          Valor:
            "Este archivo puede reimportarse directamente usando el botón 'Importar Excel'.",
        },
      ]);
      XLSX.utils.book_append_sheet(workbook, metaSheet, "Info");

      const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="precios_lve_${timestamp}.xlsx"`,
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Cache-Control": "no-store",
        },
      });
    }

    // ── Exportar como JSON ─────────────────────────────────────────────────
    const payload = {
      exported: records.length,
      exportedAt: new Date().toISOString(),
      version: "1.0",
      description:
        "Exportación de base de datos de precios LVE. Compatible con la función 'Importar Excel' (aceptando .json).",
      data: rows,
    };

    const jsonBody = JSON.stringify(payload, null, 2);

    return new NextResponse(jsonBody, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="precios_lve_${timestamp}.json"`,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting prices:", error);
    return NextResponse.json(
      { error: "Error al exportar la base de datos de precios", details: String(error) },
      { status: 500 }
    );
  }
}
