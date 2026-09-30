import ExcelJS from 'exceljs/dist/exceljs.min.js';
import type { Borders, Alignment } from 'exceljs';

export interface EnvironmentExportItem {
  id: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
  isHumanRes?: boolean;
  months?: number;
}

export interface EnvironmentExportData {
  projectName: string;
  clientName: string;
  responsible: string;
  responsibleEmail?: string;
  regionName: string;
  stageName: string;
  projectType: string;
  durationMonths: number;
  humanResMonths: number;
  totalAmount: number;
  items: EnvironmentExportItem[];
  summaryByCategory: Array<{ cat: string; v: number }>;
}

export async function exportEnvironmentFormToExcel(data: EnvironmentExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Low-Voltage Estimator - Módulo Medio Ambiente (SSMA)';
  workbook.lastModifiedBy = 'Sistema de Estimación SSMA / Medio Ambiente';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Presupuesto SSMA', {
    views: [{ showGridLines: true }],
  });

  // Paleta de Colores Medio Ambiente (SSMA / Eco)
  const COLOR_HEADER_PRIMARY = '0E7C66'; // Verde Esmeralda Corporativo
  const COLOR_HEADER_SECONDARY = '0A2E1A'; // Verde Oscuro de Sección
  const COLOR_SUBHEADER = 'E8F5E9'; // Fondo claro de campo SSMA
  const COLOR_ZEBRA_EVEN = 'F4FBF7'; // Fila par sutil eco
  const COLOR_BORDER = 'B2DFDB'; // Borde verde menta claro

  const thinBorder: Partial<Borders> = {
    top: { style: 'thin', color: { argb: COLOR_BORDER } },
    left: { style: 'thin', color: { argb: COLOR_BORDER } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
    right: { style: 'thin', color: { argb: COLOR_BORDER } },
  };

  // Configurar anchos de columna (8 columnas: A - H)
  sheet.columns = [
    { key: 'col_id', width: 8 }, // A: #
    { key: 'col_cat', width: 26 }, // B: Categoría SSMA
    { key: 'col_desc', width: 55 }, // C: Partida / Descripción
    { key: 'col_unit', width: 14 }, // D: Unidad
    { key: 'col_qty', width: 12 }, // E: Cantidad
    { key: 'col_months', width: 16 }, // F: Duración (Meses)
    { key: 'col_pu', width: 22 }, // G: P.U. Región
    { key: 'col_total', width: 24 }, // H: Importe Total
  ];

  // 1. TÍTULO PRINCIPAL (BANNER AMBIENTAL)
  sheet.mergeCells('A1:H2');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'ESTIMACIÓN PARAMÉTRICA SSMA — MEDIO AMBIENTE';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_PRIMARY } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. FOLIO Y FECHA BANNER
  const todayStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  sheet.mergeCells('A4:B4');
  const folioLabelCell = sheet.getCell('A4');
  folioLabelCell.value = 'FECHA DE EMISIÓN:';
  folioLabelCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '333333' } };
  folioLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  sheet.mergeCells('C4:E4');
  const folioValCell = sheet.getCell('C4');
  folioValCell.value = todayStr;
  folioValCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR_HEADER_PRIMARY } };
  folioValCell.alignment = { horizontal: 'center', vertical: 'middle' };
  folioValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER } };
  
  sheet.getCell('C4').border = thinBorder;
  sheet.getCell('D4').border = thinBorder;
  sheet.getCell('E4').border = thinBorder;

  // Helper para secciones
  const addSectionHeader = (rowNum: number, title: string) => {
    sheet.mergeCells(`A${rowNum}:H${rowNum}`);
    const cell = sheet.getCell(`A${rowNum}`);
    cell.value = title.toUpperCase();
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_SECONDARY } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    sheet.getRow(rowNum).height = 24;
  };

  const addKeyValueRow = (rowNum: number, key: string, value: string) => {
    sheet.mergeCells(`A${rowNum}:C${rowNum}`);
    const keyCell = sheet.getCell(`A${rowNum}`);
    keyCell.value = key;
    keyCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '334155' } };
    keyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER } };
    keyCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    sheet.mergeCells(`D${rowNum}:H${rowNum}`);
    const valCell = sheet.getCell(`D${rowNum}`);
    valCell.value = value || '—';
    valCell.font = { name: 'Calibri', size: 10, color: { argb: '1E293B' } };
    valCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };

    for (let col = 1; col <= 8; col++) {
      sheet.getRow(rowNum).getCell(col).border = thinBorder;
    }
    sheet.getRow(rowNum).height = 20;
  };

  // 3. DATOS DEL PROYECTO Y PARÁMETROS
  let currentRow = 6;
  addSectionHeader(currentRow, '1. DATOS DEL PROYECTO Y PARÁMETROS DE ESTIMACIÓN');
  currentRow++;

  addKeyValueRow(currentRow++, 'Nombre del Proyecto:', data.projectName);
  addKeyValueRow(currentRow++, 'Cliente:', data.clientName);
  addKeyValueRow(currentRow++, 'Región de Costos:', data.regionName);
  addKeyValueRow(currentRow++, 'Tipo de Obra:', data.projectType);
  addKeyValueRow(currentRow++, 'Etapa de Ejecución:', data.stageName);
  addKeyValueRow(currentRow++, 'Duración de Obra:', `${data.durationMonths} meses`);
  addKeyValueRow(currentRow++, 'Cobertura RRHH (Regla +2):', `${data.humanResMonths} meses (Duración + 2 meses)`);
  addKeyValueRow(currentRow++, 'Responsable SSMA / Estimador:', data.responsible);

  currentRow++;

  // 4. DETALLE DE PARTIDAS PARAMÉTRICAS
  addSectionHeader(currentRow, '2. DETALLE DE PARTIDAS PARAMÉTRICAS SSMA');
  currentRow++;

  // Cabecera de Tabla
  const headers = [
    '#',
    'Categoría',
    'Partida / Descripción',
    'Unidad',
    'Cant.',
    'Duración',
    'P.U. Región',
    'Importe Total',
  ];

  const headerRow = sheet.getRow(currentRow);
  headerRow.height = 26;
  headers.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_PRIMARY } };
    const align: Partial<Alignment> =
      colIdx === 0 || colIdx === 3 || colIdx === 4 || colIdx === 5
        ? { horizontal: 'center', vertical: 'middle' }
        : colIdx >= 6
        ? { horizontal: 'right', vertical: 'middle' }
        : { horizontal: 'left', vertical: 'middle', indent: 1 };
    cell.alignment = align;
    cell.border = thinBorder;
  });

  currentRow++;
  const tableStartRow = currentRow;

  const items = data.items.length > 0 ? data.items : [];

  if (items.length === 0) {
    sheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const emptyCell = sheet.getCell(`A${currentRow}`);
    emptyCell.value = 'No se seleccionaron partidas para este presupuesto.';
    emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '888888' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(currentRow).height = 24;
    for (let c = 1; c <= 8; c++) {
      sheet.getRow(currentRow).getCell(c).border = thinBorder;
    }
    currentRow++;
  } else {
    items.forEach((item, index) => {
      const row = sheet.getRow(currentRow);
      row.height = 22;
      const isEven = index % 2 === 0;
      const fillArgb = isEven ? COLOR_ZEBRA_EVEN : 'FFFFFF';

      // A: ID
      const cellId = row.getCell(1);
      cellId.value = index + 1;
      cellId.alignment = { horizontal: 'center', vertical: 'middle' };

      // B: Categoría
      const cellCat = row.getCell(2);
      cellCat.value = item.category || 'Medio Ambiente';
      cellCat.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_HEADER_PRIMARY } };
      cellCat.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      // C: Descripción
      const cellDesc = row.getCell(3);
      cellDesc.value = item.description || '';
      cellDesc.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };

      // D: Unidad
      const cellUnit = row.getCell(4);
      cellUnit.value = item.unit || 'MES';
      cellUnit.alignment = { horizontal: 'center', vertical: 'middle' };

      // E: Cantidad
      const cellQty = row.getCell(5);
      cellQty.value = Number(item.quantity) || 1;
      cellQty.numFmt = '#,##0';
      cellQty.font = { name: 'Calibri', size: 10, bold: true };
      cellQty.alignment = { horizontal: 'center', vertical: 'middle' };

      // F: Duración
      const cellMonths = row.getCell(6);
      cellMonths.value = item.isHumanRes ? `${data.humanResMonths} meses` : 'N/A';
      cellMonths.alignment = { horizontal: 'center', vertical: 'middle' };

      // G: P.U. Región
      const cellPU = row.getCell(7);
      cellPU.value = Number(item.unitCost) || 0;
      cellPU.numFmt = '"$"#,##0.00';
      cellPU.alignment = { horizontal: 'right', vertical: 'middle' };

      // H: Importe Total
      const cellTotal = row.getCell(8);
      cellTotal.value = Number(item.totalAmount) || 0;
      cellTotal.numFmt = '"$"#,##0.00';
      cellTotal.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_HEADER_PRIMARY } };
      cellTotal.alignment = { horizontal: 'right', vertical: 'middle' };

      for (let c = 1; c <= 8; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
      }

      currentRow++;
    });

    // Fila de Totales de la Tabla
    const tableEndRow = currentRow - 1;
    const totalsRow = sheet.getRow(currentRow);
    totalsRow.height = 25;

    sheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const totLabelCell = totalsRow.getCell(1);
    totLabelCell.value = 'TOTAL PARAMÉTRICO ESTIMADO SSMA (MXN)';
    totLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1E293B' } };
    totLabelCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

    // Suma de Importe Total (Columna H)
    const totSumCell = totalsRow.getCell(8);
    totSumCell.value = { formula: `SUM(H${tableStartRow}:H${tableEndRow})` };
    totSumCell.numFmt = '"$"#,##0.00';
    totSumCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLOR_HEADER_PRIMARY } };
    totSumCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalsBorder: Partial<Borders> = {
      top: { style: 'thin', color: { argb: '1E293B' } },
      bottom: { style: 'double', color: { argb: '1E293B' } },
      left: { style: 'thin', color: { argb: COLOR_BORDER } },
      right: { style: 'thin', color: { argb: COLOR_BORDER } },
    };

    for (let c = 1; c <= 8; c++) {
      const cell = totalsRow.getCell(c);
      cell.border = totalsBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER } };
    }

    currentRow++;
  }

  currentRow += 2;

  // 5. RESUMEN POR CATEGORÍA
  if (data.summaryByCategory.length > 0) {
    addSectionHeader(currentRow, '3. RESUMEN DE INVERSIÓN POR CATEGORÍA DE IMPACTO');
    currentRow++;

    // Cabecera Resumen
    const catHeaderRow = sheet.getRow(currentRow);
    catHeaderRow.height = 22;
    
    sheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const c1 = catHeaderRow.getCell(1);
    c1.value = 'Categoría SSMA';
    c1.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_SECONDARY } };
    c1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    
    sheet.mergeCells(`F${currentRow}:H${currentRow}`);
    const c2 = catHeaderRow.getCell(6);
    c2.value = 'Monto Total';
    c2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_SECONDARY } };
    c2.alignment = { horizontal: 'right', vertical: 'middle' };
    
    for (let col = 1; col <= 8; col++) catHeaderRow.getCell(col).border = thinBorder;

    currentRow++;

    data.summaryByCategory.forEach((sc) => {
      const r = sheet.getRow(currentRow);
      r.height = 20;

      sheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const cellCat = r.getCell(1);
      cellCat.value = sc.cat;
      cellCat.font = { name: 'Calibri', size: 10, color: { argb: '334155' } };
      cellCat.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      sheet.mergeCells(`F${currentRow}:H${currentRow}`);
      const cellVal = r.getCell(6);
      cellVal.value = sc.v;
      cellVal.numFmt = '"$"#,##0.00';
      cellVal.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_HEADER_PRIMARY } };
      cellVal.alignment = { horizontal: 'right', vertical: 'middle' };

      for (let col = 1; col <= 8; col++) {
        r.getCell(col).border = thinBorder;
      }
      currentRow++;
    });

    currentRow += 2;
  }

  // 6. NOTAS Y MARCO NORMATIVO SSMA
  addSectionHeader(currentRow, '4. MARCO NORMATIVO Y CONDICIONES DE ESTIMACIÓN');
  currentRow++;

  const notes = [
    '• Presupuesto calculado en base a las reglas paramétricas del Módulo Medio Ambiente (SSMA).',
    '• Los costos unitarios provienen de la base de datos oficial "Precios" ajustados por región geográfica.',
    '• La partida de Recurso Humano incluye la regla paramétrica de duración de obra + 2 meses de cobertura técnica.',
    '• Este presupuesto paramétrico tiene una vigencia de 30 días naturales a partir de la fecha de emisión.',
  ];

  notes.forEach((note) => {
    sheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const noteCell = sheet.getCell(`A${currentRow}`);
    noteCell.value = note;
    noteCell.font = { name: 'Calibri', size: 9, color: { argb: '475569' } };
    noteCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
    sheet.getRow(currentRow).height = 22;
    currentRow++;
  });

  // Generar archivo Excel en el navegador
  const cleanProjectName = (data.projectName || 'Proyecto')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');

  const fileName = `Estimacion_SSMA_Medio_Ambiente_${cleanProjectName}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

import { exportEnvironmentReportToPDF, EnvironmentPdfItem, EnvironmentPdfMetadata } from './pdf-export';

export function exportEnvironmentFormToPDF(data: EnvironmentExportData): string {
  const items: EnvironmentPdfItem[] = data.items.map((item) => ({
    id: item.id,
    description: item.description,
    category: item.category,
    unit: item.unit,
    quantity: item.quantity,
    unitCost: item.unitCost,
    totalAmount: item.totalAmount,
    isHumanRes: !!item.isHumanRes,
    months: item.months ?? data.durationMonths,
  }));

  const meta: EnvironmentPdfMetadata = {
    projectName: data.projectName,
    clientName: data.clientName,
    responsible: data.responsible,
    regionName: data.regionName,
    stageName: data.stageName,
    projectType: data.projectType,
    durationMonths: data.durationMonths,
    totalAmount: data.totalAmount,
    summaryByCategory: data.summaryByCategory,
    currency: 'MXN',
  };

  return exportEnvironmentReportToPDF(items, meta);
}
