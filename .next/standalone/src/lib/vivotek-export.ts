import ExcelJS from 'exceljs/dist/exceljs.min.js';
import type { Borders, Alignment } from 'exceljs';

export interface VivotekProductItem {
  modelo: string;
  descripcion: string;
  cantidad: number;
  precioRegularCompra: number;
  precioProyecto: number;
  extensionGarantia: string; // 'Sin garantía', '1 año (5%)', '2 años (10%)', '3 años (15%)'
  precioUnitario: number;
  precioTotal: number;
  observaciones?: string;
  comentarios?: string;
}

export interface VivotekFormData {
  numRegistro: string;

  // Datos del Proyecto
  nombreProyecto: string;
  fechaRegistro: string;
  empresaUsuarioFinal: string;
  lugarProyecto: string;
  contactoUsuarioFinal: string;
  emailUsuarioFinal: string;
  descripcionProyecto: string;
  vmsIntegracion: string;
  competencia: string;
  tipoCompra: string; // 'Una sola compra' | 'Por etapas'
  fechaEstimadaCompra: string;

  // Datos del Integrador
  nombreEmpresaIntegrador: string;
  telefonoIntegrador: string;
  personaRegistraIntegrador: string;
  emailIntegrador: string;
  responsableIngenieria: string;
  numCertificado: string;

  // Datos del Mayorista
  nombreMayorista: string;
  telefonoMayorista: string;
  personaRegistraMayorista: string;
  emailMayorista: string;

  // Productos
  productos: VivotekProductItem[];
}

export async function exportVivotekFormToExcel(data: VivotekFormData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Low-Voltage Estimator - VIVOTEK';
  workbook.lastModifiedBy = 'VIVOTEK Project Registration System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Registro VIVOTEK', {
    views: [{ showGridLines: true }],
  });

  // Estilos de Paleta VIVOTEK / TVC
  const COLOR_HEADER_PRIMARY = '0D5C3A'; // Verde esmeralda corporativo
  const COLOR_HEADER_SECONDARY = '1B4D3E'; // Verde oscuro de sección
  const COLOR_SUBHEADER = 'E8F2EC'; // Fondo claro de campo
  const COLOR_ZEBRA_EVEN = 'F4F8F5'; // Fila par sutil
  const COLOR_BORDER = 'C5D1C9'; // Borde gris claro suave

  const thinBorder: Partial<Borders> = {
    top: { style: 'thin', color: { argb: COLOR_BORDER } },
    left: { style: 'thin', color: { argb: COLOR_BORDER } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
    right: { style: 'thin', color: { argb: COLOR_BORDER } },
  };

  // Configurar anchos de columna (9 columnas: A - I)
  sheet.columns = [
    { key: 'col_id', width: 8 }, // A: ID
    { key: 'col_model', width: 22 }, // B: Modelo
    { key: 'col_desc', width: 55 }, // C: Descripción
    { key: 'col_qty', width: 14 }, // D: Cantidad
    { key: 'col_p_reg', width: 24 }, // E: Precio regular de compra
    { key: 'col_p_proj', width: 22 }, // F: Precio de proyecto
    { key: 'col_warranty', width: 24 }, // G: Extensión de garantía
    { key: 'col_p_unit', width: 20 }, // H: Precio unitario
    { key: 'col_p_total', width: 22 }, // I: Precio total
  ];

  // 1. TÍTULO PRINCIPAL (BANNER)
  sheet.mergeCells('A1:I2');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'FORMATO DE REGISTRO DE PROYECTO — VIVOTEK / TVC';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_PRIMARY } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. NÚMERO DE REGISTRO (FOLIO BANNER)
  sheet.mergeCells('A4:C4');
  const folioLabelCell = sheet.getCell('A4');
  folioLabelCell.value = 'NÚMERO DE REGISTRO DE PROYECTO:';
  folioLabelCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '333333' } };
  folioLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  sheet.mergeCells('D4:F4');
  const folioValCell = sheet.getCell('D4');
  folioValCell.value = data.numRegistro || 'N/A';
  folioValCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: COLOR_HEADER_PRIMARY } };
  folioValCell.alignment = { horizontal: 'center', vertical: 'middle' };
  folioValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER } };
  sheet.getCell('D4').border = thinBorder;
  sheet.getCell('E4').border = thinBorder;
  sheet.getCell('F4').border = thinBorder;

  // Helper para secciones
  const addSectionHeader = (rowNum: number, title: string) => {
    sheet.mergeCells(`A${rowNum}:I${rowNum}`);
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
    keyCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '444444' } };
    keyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER } };
    keyCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    sheet.mergeCells(`D${rowNum}:I${rowNum}`);
    const valCell = sheet.getCell(`D${rowNum}`);
    valCell.value = value || '—';
    valCell.font = { name: 'Calibri', size: 10, color: { argb: '222222' } };
    valCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };

    for (let col = 1; col <= 9; col++) {
      sheet.getRow(rowNum).getCell(col).border = thinBorder;
    }
    sheet.getRow(rowNum).height = 20;
  };

  // 3. DATOS DEL PROYECTO
  let currentRow = 6;
  addSectionHeader(currentRow, '1. DATOS DEL PROYECTO');
  currentRow++;

  addKeyValueRow(currentRow++, 'Nombre del proyecto:', data.nombreProyecto);
  addKeyValueRow(currentRow++, 'Fecha de registro:', data.fechaRegistro);
  addKeyValueRow(currentRow++, 'Empresa del usuario final:', data.empresaUsuarioFinal);
  addKeyValueRow(currentRow++, 'Lugar del proyecto:', data.lugarProyecto);
  addKeyValueRow(currentRow++, 'Contacto del usuario final:', data.contactoUsuarioFinal);
  addKeyValueRow(currentRow++, 'E-mail del usuario final:', data.emailUsuarioFinal);
  addKeyValueRow(currentRow++, 'Breve descripción del proyecto:', data.descripcionProyecto);
  addKeyValueRow(currentRow++, 'VMS o Integración ofertada:', data.vmsIntegracion);
  addKeyValueRow(currentRow++, 'Competencia:', data.competencia);
  addKeyValueRow(currentRow++, '¿Una sola compra o etapas?:', data.tipoCompra);
  addKeyValueRow(currentRow++, 'Fecha estimada de compra:', data.fechaEstimadaCompra);

  currentRow++;

  // 4. DATOS DEL INTEGRADOR Y MAYORISTA
  addSectionHeader(currentRow, '2. DATOS DEL INTEGRADOR Y MAYORISTA');
  currentRow++;

  addKeyValueRow(currentRow++, 'Empresa Integradora:', data.nombreEmpresaIntegrador);
  addKeyValueRow(currentRow++, 'Teléfono / Persona que registra:', `${data.telefonoIntegrador || '—'} | ${data.personaRegistraIntegrador || '—'}`);
  addKeyValueRow(currentRow++, 'E-mail Integrador / Responsable Ing.:', `${data.emailIntegrador || '—'} | ${data.responsableIngenieria || '—'}`);
  addKeyValueRow(currentRow++, '# de Certificado:', data.numCertificado);
  addKeyValueRow(currentRow++, 'Mayorista:', `${data.nombreMayorista || 'TVC Línea Comercial'} (${data.personaRegistraMayorista || 'Ejecutivo TVC'})`);
  addKeyValueRow(currentRow++, 'Contacto Mayorista:', `${data.telefonoMayorista || '—'} | ${data.emailMayorista || '—'}`);

  currentRow += 2;

  // 5. DETALLE DE PRODUCTOS / MODELOS
  addSectionHeader(currentRow, '3. DETALLE DE PRODUCTOS / MODELOS VIVOTEK');
  currentRow++;

  // Cabecera de Tabla
  const headers = [
    'ID',
    'Modelo',
    'Descripción',
    'Cant.',
    'P. Reg. Compra',
    'P. Proyecto',
    'Ext. Garantía',
    'P. Unitario',
    'P. Total',
  ];

  const headerRow = sheet.getRow(currentRow);
  headerRow.height = 26;
  headers.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_PRIMARY } };
    const align: Partial<Alignment> =
      colIdx === 0 || colIdx === 3 || colIdx === 6
        ? { horizontal: 'center', vertical: 'middle' }
        : colIdx >= 4
        ? { horizontal: 'right', vertical: 'middle' }
        : { horizontal: 'left', vertical: 'middle', indent: 1 };
    cell.alignment = align;
    cell.border = thinBorder;
  });

  currentRow++;
  const tableStartRow = currentRow;

  const items = data.productos.length > 0 ? data.productos : [];

  if (items.length === 0) {
    sheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const emptyCell = sheet.getCell(`A${currentRow}`);
    emptyCell.value = 'No hay equipos registrados en el listado.';
    emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: '888888' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(currentRow).height = 24;
    for (let c = 1; c <= 9; c++) {
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

      // B: Modelo
      const cellModel = row.getCell(2);
      cellModel.value = item.modelo || '';
      cellModel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_HEADER_PRIMARY } };
      cellModel.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      // C: Descripción
      const cellDesc = row.getCell(3);
      cellDesc.value = item.descripcion || '';
      cellDesc.alignment = { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true };

      // D: Cantidad
      const cellQty = row.getCell(4);
      cellQty.value = Number(item.cantidad) || 0;
      cellQty.numFmt = '#,##0';
      cellQty.font = { name: 'Calibri', size: 10, bold: true };
      cellQty.alignment = { horizontal: 'center', vertical: 'middle' };

      // E: Precio regular de compra
      const cellPReg = row.getCell(5);
      cellPReg.value = Number(item.precioRegularCompra) || 0;
      cellPReg.numFmt = '"$"#,##0.00';
      cellPReg.alignment = { horizontal: 'right', vertical: 'middle' };

      // F: Precio de proyecto
      const cellPProj = row.getCell(6);
      cellPProj.value = Number(item.precioProyecto) || 0;
      cellPProj.numFmt = '"$"#,##0.00';
      cellPProj.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '1E6A4B' } };
      cellPProj.alignment = { horizontal: 'right', vertical: 'middle' };

      // G: Extensión de garantía
      const cellWarr = row.getCell(7);
      cellWarr.value = item.extensionGarantia || 'Sin garantía';
      cellWarr.alignment = { horizontal: 'center', vertical: 'middle' };

      // H: Precio unitario
      const cellPUnit = row.getCell(8);
      cellPUnit.value = Number(item.precioUnitario) || 0;
      cellPUnit.numFmt = '"$"#,##0.00';
      cellPUnit.alignment = { horizontal: 'right', vertical: 'middle' };

      // I: Precio total
      const cellPTotal = row.getCell(9);
      cellPTotal.value = Number(item.precioTotal) || 0;
      cellPTotal.numFmt = '"$"#,##0.00';
      cellPTotal.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_HEADER_PRIMARY } };
      cellPTotal.alignment = { horizontal: 'right', vertical: 'middle' };

      for (let c = 1; c <= 9; c++) {
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

    sheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const totLabelCell = totalsRow.getCell(1);
    totLabelCell.value = 'TOTALES GENERALES DEL REGISTRO';
    totLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: '333333' } };
    totLabelCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

    // Suma de Cantidad (Columna D)
    const totQtyCell = totalsRow.getCell(4);
    totQtyCell.value = { formula: `SUM(D${tableStartRow}:D${tableEndRow})` };
    totQtyCell.numFmt = '#,##0';
    totQtyCell.font = { name: 'Calibri', size: 11, bold: true };
    totQtyCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Suma de Precio Total (Columna I)
    const totSumCell = totalsRow.getCell(9);
    totSumCell.value = { formula: `SUM(I${tableStartRow}:I${tableEndRow})` };
    totSumCell.numFmt = '"$"#,##0.00';
    totSumCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLOR_HEADER_PRIMARY } };
    totSumCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalsBorder: Partial<Borders> = {
      top: { style: 'thin', color: { argb: '333333' } },
      bottom: { style: 'double', color: { argb: '333333' } },
      left: { style: 'thin', color: { argb: COLOR_BORDER } },
      right: { style: 'thin', color: { argb: COLOR_BORDER } },
    };

    for (let c = 1; c <= 9; c++) {
      const cell = totalsRow.getCell(c);
      cell.border = totalsBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER } };
    }

    currentRow++;
  }

  currentRow += 2;

  // 6. NOTAS DE VIGENCIA Y TÉRMINOS
  addSectionHeader(currentRow, '4. NOTAS IMPORTANTES SOBRE LA VIGENCIA DEL REGISTRO');
  currentRow++;

  const notes = [
    '• Este registro tendrá una vigencia de 30 días naturales. La extensión del mismo no está ligada al tiempo definido por la fecha de compra. Si la oportunidad necesita una vigencia mayor, deberá contar con seguimiento y actualizaciones dentro de los 30 días naturales indicados.',
    '• Se solicita que se reporte el estado que la oportunidad guarda para otorgar una extensión de 30 días naturales adicionales.',
    '• Es responsabilidad del Integrador confirmar que sus reportes de actualización sean recibidos y aplicados al registro.',
    '• VIVOTEK informará al término de los 30 días el vencimiento de este registro. Si no recibe reporte de seguimiento, el registro vencerá automáticamente.',
  ];

  notes.forEach((note) => {
    sheet.mergeCells(`A${currentRow}:I${currentRow}`);
    const noteCell = sheet.getCell(`A${currentRow}`);
    noteCell.value = note;
    noteCell.font = { name: 'Calibri', size: 9, color: { argb: '555555' } };
    noteCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
    sheet.getRow(currentRow).height = 24;
    currentRow++;
  });

  // Generar archivo Excel en el navegador
  const cleanProjectName = (data.nombreProyecto || 'Proyecto')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const cleanFolio = (data.numRegistro || 'REG-VIV-000000')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  const fileName = `Registro_VIVOTEK_TVC_${cleanProjectName}_${cleanFolio}.xlsx`;

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
