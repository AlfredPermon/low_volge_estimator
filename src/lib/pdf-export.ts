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

export interface ExtinguisherPdfItem {
  sku: string;
  name: string;
  type: string;
  capacity: string;
  count: number;
  unitCost: number;
  totalAmount: number;
  medicalArea: string;
}

export interface ExtinguisherPdfMetadata {
  projectName?: string;
  clientName?: string;
  responsible?: string;
  revision?: string;
  currency?: "MXN" | "USD";
  subtotalAmount: number;
  ivaRate: number;
  ivaAmount: number;
  totalWithIva: number;
  totalCount: number;
  validCount: number;
}

/**
 * Genera el reporte PDF paramétrico oficial de extintores en el formato estandarizado "Tecnologías de Seguridad".
 */
export function exportExtinguisherReportToPDF(
  items: ExtinguisherPdfItem[],
  meta: ExtinguisherPdfMetadata
): string {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const rightX = pageW - margin;
  const currency = meta.currency || "MXN";
  let y = margin;

  // ─── Header Principal (GESTION DE RIESGOS Y CONTROL)
  doc.setFillColor(0, 32, 96); // Azul marino oficial (#002060)
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GESTION DE RIESGOS Y CONTROL", margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Paramétrico Extintores", margin, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(meta.revision || "Rev. 1", rightX, 11, { align: "right" });
  doc.setFontSize(8);
  doc.text("Presupuesto Paramétrico", rightX, 17, { align: "right" });

  y = 30;

  // ─── Bloque de Información del Proyecto
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(meta.projectName || "Estimación Paramétrica de Extintores", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Cliente: ${meta.clientName || "Cliente General"}`, margin, y);
  y += 4;
  doc.text(`Proyecto: ${meta.projectName || "Estimación General"}`, margin, y);
  y += 4;
  doc.text(`Responsable: ${meta.responsible || "Ing. Responsable de Proyecto"}`, margin, y);
  y += 4;
  doc.text(`Moneda: ${currency}`, margin, y);
  y += 7;

  // ─── Posicionamiento de Columnas
  const COL_PARTIDA  = margin + 1;      // x=15
  const COL_MARCA    = margin + 22;     // x=36
  const COL_MODELO   = margin + 42;     // x=56
  const COL_DESC     = margin + 66;     // x=80
  const COL_UN       = margin + 118;    // x=132
  const COL_CANT     = margin + 134;    // x=148
  const COL_PU       = margin + 156;    // x=170
  const COL_IMPORTE  = rightX;          // right edge

  const drawTableHeader = (yPos: number): number => {
    doc.setFillColor(176, 196, 222); // Steel blue tenue (#B0C4DE)
    doc.rect(margin, yPos - 4, pageW - margin * 2, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);
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
    if (y + needed > pageH - 45) {
      doc.addPage();
      y = margin;
    }
  };

  // ─── Franja de Sistema Extintores
  ensureSpace(20);
  doc.setFillColor(176, 196, 222);
  doc.rect(margin, y - 4, pageW - margin * 2, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 32, 96);
  doc.text("5.7.6 Sistema Extintores & Protección Contra Incendio", margin + 1, y + 1);
  doc.text(formatCurrency(meta.subtotalAmount, currency), rightX, y + 1, { align: "right" });
  y += 6;

  y = drawTableHeader(y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);

  const ensureRowSpace = (needed: number): void => {
    if (y + needed > pageH - 45) {
      doc.addPage();
      y = margin;
      y = drawTableHeader(y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
    }
  };

  // ─── Renderizado de Filas
  items.forEach((item, index) => {
    doc.setFontSize(7.5);

    const partidaText = `5.7.6.${String(index + 1).padStart(2, "0")}`;
    const marcaText = item.sku.includes("ANSUL") ? "ANSUL" : item.sku.includes("AMEREX") ? "AMEREX" : "GENÉRICO";
    const modeloText = item.sku;
    const descText = `${item.name} [Área: ${item.medicalArea || "General"}]`;

    const widthPartida = COL_MARCA - COL_PARTIDA - 1;
    const widthMarca = COL_MODELO - COL_MARCA - 1;
    const widthModelo = COL_DESC - COL_MODELO - 1;
    const widthDesc = COL_UN - COL_DESC - 1;

    const partidaLines = doc.splitTextToSize(partidaText, widthPartida);
    const marcaLines = doc.splitTextToSize(marcaText, widthMarca);
    const modeloLines = doc.splitTextToSize(modeloText, widthModelo);
    const descLines = doc.splitTextToSize(descText, widthDesc);

    const maxLines = Math.max(1, partidaLines.length, marcaLines.length, modeloLines.length, descLines.length);
    const lineHeight = 3.6;
    const rowGap = 1.0;
    const rowHeight = maxLines * lineHeight + rowGap;

    ensureRowSpace(rowHeight);

    for (let i = 0; i < maxLines; i++) {
      const yy = y + i * lineHeight;
      if (partidaLines[i]) doc.text(String(partidaLines[i]), COL_PARTIDA, yy);
      if (marcaLines[i]) doc.text(String(marcaLines[i]), COL_MARCA, yy);
      if (modeloLines[i]) doc.text(String(modeloLines[i]), COL_MODELO, yy);
      if (descLines[i]) doc.text(String(descLines[i]), COL_DESC, yy);
    }

    doc.text("PZA", COL_UN, y);
    doc.text(String(item.count), COL_CANT, y, { align: "right" });
    doc.text(formatCurrency(item.unitCost, currency), COL_PU, y, { align: "right" });
    doc.text(formatCurrency(item.totalAmount, currency), COL_IMPORTE, y, { align: "right" });

    y += rowHeight;
  });

  y += 4;

  // ─── Bloque de Totales Financieros
  ensureSpace(35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 32, 96);
  doc.text("Resumen Financiero del Sistema", margin, y);
  y += 5;

  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y - 4, pageW - margin * 2, 22, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);

  doc.text("Subtotal Equipamiento Extintores:", margin + 3, y);
  doc.text(formatCurrency(meta.subtotalAmount, currency), rightX - 3, y, { align: "right" });
  y += 5;

  doc.text(`IVA (${(meta.ivaRate * 100).toFixed(0)}%):`, margin + 3, y);
  doc.text(formatCurrency(meta.ivaAmount, currency), rightX - 3, y, { align: "right" });
  y += 5;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 3, y - 3, rightX - 3, y - 3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 32, 96);
  doc.text("GRAN TOTAL ESTIMADO CON IVA:", margin + 3, y + 1);
  doc.text(formatCurrency(meta.totalWithIva, currency), rightX - 3, y + 1, { align: "right" });
  y += 10;

  // ─── Matriz de Normatividad Hospitalaria (NOM-002, NOM-016, NOM-026)
  ensureSpace(35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 32, 96);
  doc.text("Dictamen de Cumplimiento Normativo Oficial (NOM-002 / NOM-016 / NOM-026)", margin, y);
  y += 5;

  doc.setFillColor(240, 244, 248);
  doc.rect(margin, y - 3, pageW - margin * 2, 22, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);

  const nomText = [
    "• NOM-002-STPS-2010: Cumplimiento de distancias máximas (<=15m alto riesgo / <=30m ordinario) y altura <=1.50m.",
    "• NOM-016-SSA3-2012: Compatibilidad química (Quirófanos CO2, CEYE/Laboratorio Agente Limpio, Cocina Clase K).",
    "• NOM-026-STPS-2008: Señalización fotoluminiscente obligatoria colocada entre 1.80m y 2.00m sobre piso terminado.",
    `• Estado Global del Proyecto: ${meta.validCount} de ${meta.totalCount} extintores en ubicaciones 100% validadas.`
  ];
  nomText.forEach((t) => {
    doc.text(t, margin + 3, y);
    y += 4.5;
  });

  y += 8;

  // ─── Cuadro de Firmas y Validación Técnica
  ensureSpace(35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text("Cuadro de Firmas y Validación Técnica del Dictamen", pageW / 2, y, { align: "center" });
  y += 14;

  const colW = (pageW - margin * 2) / 3;
  const sig1X = margin + colW / 2;
  const sig2X = margin + colW + colW / 2;
  const sig3X = margin + colW * 2 + colW / 2;

  doc.setDrawColor(80, 80, 80);
  doc.line(sig1X - 25, y, sig1X + 25, y);
  doc.line(sig2X - 25, y, sig2X + 25, y);
  doc.line(sig3X - 25, y, sig3X + 25, y);
  y += 4;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text(meta.responsible || "Ing. Responsable de Proyecto", sig1X, y, { align: "center" });
  doc.text("Supervisión Técnica PCI", sig2X, y, { align: "center" });
  doc.text(meta.clientName || "Aprobación del Cliente", sig3X, y, { align: "center" });
  y += 3.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Elaboró / Especialista PCI", sig1X, y, { align: "center" });
  doc.text("Revisó Normatividad STPS/SSA3", sig2X, y, { align: "center" });
  doc.text("Aprobó / Cliente Representante", sig3X, y, { align: "center" });

  // ─── Footer Paginado
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
      { align: "center" }
    );
  }

  const cleanName = (meta.projectName || "reporte_extintores").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  const filename = `${cleanName}_Parametrico_Extintores.pdf`;
  doc.save(filename);
  return filename;
}

