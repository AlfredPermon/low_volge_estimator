'use client';

/**
 * Exportador PDF del presupuesto (TASK §14.6, §17).
 * Usa @react-pdf/renderer para generar el PDF client-side.
 */

import { jsPDF } from "jspdf";
import { formatCurrency } from "./utils";
import { filterLineItemsForExport } from "./export-filters";
import type { LineItem, CalculationResult } from "@/store/estimate-store";
import type { SystemName } from "./calculator";

export interface PdfMetadata {
  name: string;
  clientName: string;
  projectName: string;
  revision: string;
  responsible: string;
  notes: string;
  factorsNotes: string;
  currency: "MXN" | "USD";
}

const SYSTEM_ORDER: SystemName[] = [
  "CCTV",
  "ACCESO",
  "VOCEO",
  "INCENDIO",
  "CANALIZACION",
  "CABLEADO",
  "GENERAL",
];

const SYSTEM_LABELS: Record<string, string> = {
  CCTV: "5.7.3 Sistema CCTV",
  ACCESO: "5.7.4 Sistema de Control de Acceso",
  VOCEO: "5.7.5 Sistema de Voceo",
  INCENDIO: "5.7.5 Sistema Contra Incendio",
  CANALIZACION: "Canalización",
  CABLEADO: "Cableado",
  GENERAL: "Servicios Generales",
};

/**
 * Genera un PDF profesional con:
 *  - Encabezado con datos del proyecto
 *  - Tabla agrupada por sistema
 *  - Resumen financiero: Subtotal Directo y GRAN TOTAL (sin IVA)
 *  - Observaciones y responsable
 *
 * Devuelve el nombre de archivo sugerido.
 */
export function exportBudgetToPDF(
  lineItems: LineItem[],
  result: CalculationResult,
  meta: PdfMetadata,
): string {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const exportItems = filterLineItemsForExport(lineItems);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const rightX = pageW - margin;
  let y = margin;

  // ─── Title bar
  doc.setFillColor(0, 0, 139);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Tecnologías de Seguridad", margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Paramétrico Sistemas Especiales de Bajo Voltaje", margin, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(meta.revision || "Rev. 1", rightX, 11, { align: "right" });
  doc.setFontSize(8);
  doc.text("Presupuesto Paramétrico", rightX, 17, { align: "right" });

  y = 30;

  // ─── Project info block
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(meta.name || "Sin nombre", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (meta.clientName) {
    doc.text(`Cliente: ${meta.clientName}`, margin, y);
    y += 4;
  }
  if (meta.projectName) {
    doc.text(`Proyecto: ${meta.projectName}`, margin, y);
    y += 4;
  }
  if (meta.responsible) {
    doc.text(`Responsable: ${meta.responsible}`, margin, y);
    y += 4;
  }
  doc.text(`Moneda: ${meta.currency}`, margin, y);
  y += 6;

  // ─── Group items by system
  const grouped = new Map<string, LineItem[]>();
  for (const item of exportItems) {
    const list = grouped.get(item.system) ?? [];
    list.push(item);
    grouped.set(item.system, list);
  }

  // Column X positions (all relative to margin=14, page width=210mm)
  // Layout: Partida|Marca|Modelo|Descripción|Un|Cant|P.U.|Importe
  const COL_PARTIDA  = margin + 1;      // x=15
  const COL_MARCA    = margin + 21;     // x=35  (width~18mm)
  const COL_MODELO   = margin + 42;     // x=56  (width~20mm)
  const COL_DESC     = margin + 65;     // x=79  (width~52mm)
  const COL_UN       = margin + 118;    // x=132 (width~8mm)
  const COL_CANT     = margin + 134;    // x=148 right-align (width~10mm)
  const COL_PU       = margin + 155;    // x=169 right-align (width~16mm)
  const COL_IMPORTE  = rightX;          // right edge

  const drawTableHeader = (yPos: number): number => {
    doc.setFillColor(176, 196, 222);
    doc.rect(margin, yPos - 4, pageW - margin * 2, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    doc.text("Partida",     COL_PARTIDA, yPos);
    doc.text("Marca",       COL_MARCA,   yPos);
    doc.text("Modelo",      COL_MODELO,  yPos);
    doc.text("Descripción", COL_DESC,    yPos);
    doc.text("Un",          COL_UN,      yPos);
    doc.text("Cant",        COL_CANT,    yPos, { align: "right" });
    doc.text("P.U.",        COL_PU,      yPos, { align: "right" });
    doc.text("Importe",     COL_IMPORTE, yPos, { align: "right" });
    return yPos + 4;
  };

  const ensureSpace = (needed: number): void => {
    if (y + needed > pageH - 50) {
      doc.addPage();
      y = margin;
    }
  };

  for (const system of SYSTEM_ORDER) {
    const items = grouped.get(system);
    if (!items || items.length === 0) continue;

    ensureSpace(20);
    // System banner
    doc.setFillColor(176, 196, 222);
    doc.rect(margin, y - 4, pageW - margin * 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 139);
    doc.text(SYSTEM_LABELS[system] ?? system, margin + 1, y + 1);
    const subtotal = items.reduce((s, it) => s + (it.total ?? 0), 0);
    doc.text(formatCurrency(subtotal, meta.currency), rightX, y + 1, {
      align: "right",
    });
    y += 6;

    y = drawTableHeader(y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);

    const ensureRowSpace = (needed: number): void => {
      if (y + needed > pageH - 50) {
        doc.addPage();
        y = margin;
        y = drawTableHeader(y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(40, 40, 40);
      }
    };

    for (const item of items) {
      doc.setFontSize(7.5);

      const widthPartida = COL_MARCA - COL_PARTIDA - 1;
      const widthMarca = COL_MODELO - COL_MARCA - 1;
      const widthModelo = COL_DESC - COL_MODELO - 1;
      const widthDesc = COL_UN - COL_DESC - 1;

      const partidaText = item.partida ?? "";
      const marcaText = item.marca ?? "";
      const modeloText = (item.modelo ?? item.code ?? "").trim();
      const descText = item.description ?? "";

      const partidaLines = doc.splitTextToSize(partidaText, widthPartida);
      const marcaLines = doc.splitTextToSize(marcaText, widthMarca);
      const modeloLines = doc.splitTextToSize(modeloText, widthModelo);
      const descLines = doc.splitTextToSize(descText, widthDesc);

      const maxLines = Math.max(
        1,
        partidaLines.length,
        marcaLines.length,
        modeloLines.length,
        descLines.length,
      );

      const lineHeight = 3.6;
      const rowGap = 0.9;
      const rowHeight = maxLines * lineHeight + rowGap;

      ensureRowSpace(rowHeight);

      for (let i = 0; i < maxLines; i++) {
        const yy = y + i * lineHeight;
        if (partidaLines[i]) doc.text(String(partidaLines[i]), COL_PARTIDA, yy);
        if (marcaLines[i]) doc.text(String(marcaLines[i]), COL_MARCA, yy);
        if (modeloLines[i]) doc.text(String(modeloLines[i]), COL_MODELO, yy);
        if (descLines[i]) doc.text(String(descLines[i]), COL_DESC, yy);
      }

      doc.text(item.unit ?? "", COL_UN, y);
      doc.text(String(item.quantity ?? 0), COL_CANT, y, { align: "right" });
      doc.text((item.unitCost ?? 0).toFixed(2), COL_PU, y, { align: "right" });
      doc.text((item.totalAmount ?? item.total ?? 0).toFixed(2), COL_IMPORTE, y, {
        align: "right",
      });

      y += rowHeight;
    }
    y += 2;
  }

  // ─── Totals
  ensureSpace(28);
  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, rightX, y);
  y += 6;

  const drawTotal = (label: string, value: number, opts?: { bold?: boolean; color?: [number, number, number] }): void => {
    const color = opts?.color ?? [60, 60, 60];
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.bold ? 11 : 9);
    doc.setTextColor(...color);
    const valueText = formatCurrency(value, meta.currency);
    const valueWidth = doc.getTextWidth(valueText);
    const labelRightX = rightX - valueWidth - 6;
    doc.text(label, labelRightX, y, { align: "right" });
    doc.text(valueText, rightX, y, { align: "right" });
    y += opts?.bold ? 7 : 5;
  };

  // ─── Resumen de Totales
  ensureSpace(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 139);
  doc.text("Resumen de Totales", margin, y);
  y += 6;

  // Fondo tenue para la tabla de totales
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 4, pageW - margin * 2, 28, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  
  // Subtotal Directo (Materiales + Mano de Obra)
  doc.text("Subtotal Directo (Materiales + Mano de Obra)", margin + 2, y);
  doc.text(formatCurrency(result.subtotalDirect, meta.currency), rightX - 2, y, { align: "right" });
  y += 5;

  // Costos Indirectos
  doc.text("Costos Indirectos", margin + 2, y);
  doc.text(formatCurrency(result.subtotalIndirects, meta.currency), rightX - 2, y, { align: "right" });
  y += 5;

  // Utilidad
  doc.text("Utilidad", margin + 2, y);
  doc.text(formatCurrency(result.subtotalUtility, meta.currency), rightX - 2, y, { align: "right" });
  y += 5;

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 2, y - 3, rightX - 2, y - 3);

  // GRAN TOTAL (sin IVA)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 139);
  doc.text("GRAN TOTAL (sin IVA)", margin + 2, y + 1);
  doc.text(formatCurrency(result.grandTotal, meta.currency), rightX - 2, y + 1, { align: "right" });
  y += 8;

  const combinedNotes = [String(meta.factorsNotes || "").trim(), String(meta.notes || "").trim()]
    .filter(Boolean)
    .join("\n\n");
  if (combinedNotes) {
    y += 8;
    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 139);
    doc.text("Notas adicionales", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(combinedNotes, pageW - margin * 2);
    for (const line of lines) {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4.4;
    }
  }

  // ─── Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${p} de ${totalPages} · Generado por Low Voltage Estimator`,
      pageW / 2,
      pageH - 6,
      { align: "center" },
    );
  }

  // ─── Save
  const filename =
    (meta.name || "presupuesto").replace(/[^\w\s-]/g, "").trim() +
    "_" +
    (meta.revision || "rev-1").replace(/\s+/g, "-") +
    ".pdf";
  doc.save(filename);
  return filename;
}
