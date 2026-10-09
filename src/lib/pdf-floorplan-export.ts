'use client';

import { jsPDF } from 'jspdf';
import type { FloorplanItem } from '@/store/estimate-store';
import { CLASS_CONFIG, getFireClassForAgent } from '@/components/plano-espacial/extinguisher-seed/ExtinguisherClassIcon';

export interface FloorplanPdfOptions {
  includeRadii: boolean;
  projectName?: string;
  floorplanName?: string;
}

export async function exportFloorplanExtinguishersToPDF(
  floorplan: FloorplanItem,
  options: FloorplanPdfOptions
): Promise<void> {
  if (!floorplan.imageUrl) {
    throw new Error('No hay imagen de plano cargada.');
  }

  // Cargar la imagen original para saber sus dimensiones
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('No se pudo cargar la imagen del plano.'));
    img.src = floorplan.imageUrl as string;
  });

  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;

  // Determinar orientación basada en la imagen
  const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';

  // Usar A3 para mayor resolución y espacio
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a3',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Márgenes
  const margin = 10;
  const titleHeight = 15;
  const bottomFooterHeight = 10;
  
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2 - titleHeight - bottomFooterHeight;

  // Escalar imagen para que encaje en el espacio disponible
  const scaleX = usableWidth / imgWidth;
  const scaleY = usableHeight / imgHeight;
  const scaleToFit = Math.min(scaleX, scaleY);

  const finalImgW = imgWidth * scaleToFit;
  const finalImgH = imgHeight * scaleToFit;

  // Centrar imagen en la página
  const startX = margin + (usableWidth - finalImgW) / 2;
  const startY = margin + titleHeight + (usableHeight - finalImgH) / 2;

  // 1. Dibujar Título y Metadatos
  doc.setFillColor(0, 32, 96); // Azul institucional
  doc.rect(0, 0, pageWidth, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SEMBRADO DE EXTINTORES Y PROTECCIÓN CONTRA INCENDIO', margin, 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(options.projectName || 'Proyecto General', pageWidth - margin, 10, { align: 'right' });
  doc.text(`Nivel / Plano: ${options.floorplanName || floorplan.name}`, pageWidth - margin, 15, { align: 'right' });

  // 2. Dibujar Imagen Base del Plano
  // Usamos compresión JPEG nativa de jsPDF para que sea super ligero
  doc.addImage(img, 'JPEG', startX, startY, finalImgW, finalImgH, undefined, 'FAST');

  // Marco sutil para el plano
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(startX, startY, finalImgW, finalImgH);

  // Calcular las dimensiones del canvas web donde se guardaron las coordenadas (x, y)
  // Replicando la lógica de floorplan-view.tsx:
  const aspect = imgWidth / imgHeight;
  const canvasWidth = Math.max(1200, Math.min(imgWidth, 1400));
  const canvasHeight = Math.max(650, Math.round(canvasWidth / aspect));

  // 3. Dibujar Extintores
  const extinguishers = floorplan.devices.filter(d => d.system === 'extinguisher' && d.extinguisherData);
  
  // Tamaño base del icono en mm (ajustable si hay muchos/pocos)
  const ICON_RADIUS_MM = 3.5; 

  const legendTypes = new Set<string>();

  extinguishers.forEach(ext => {
    // Coordenadas relativas en la imagen PDF basadas en el tamaño del canvas web original
    const relX = (ext.x / canvasWidth) * finalImgW;
    const relY = (ext.y / canvasHeight) * finalImgH;
    
    const absX = startX + relX;
    const absY = startY + relY;

    const fireClass = getFireClassForAgent(ext.extinguisherData?.type);
    const config = CLASS_CONFIG[fireClass];
    legendTypes.add(fireClass);

    // Dibujar Radio de Cobertura (si está activo)
    if (options.includeRadii && ext.extinguisherData?.coverageRadiusMeters) {
      // 1 metro en pixeles originales = 1 / floorplan.scaleMetersPerPx
      const radiusPx = ext.extinguisherData.coverageRadiusMeters / floorplan.scaleMetersPerPx;
      const radiusMm = radiusPx * scaleToFit;

      // Color tenue según la clase
      // Convertir HEX a RGB para jsPDF
      const r = parseInt(config.bgHex.slice(1, 3), 16);
      const g = parseInt(config.bgHex.slice(3, 5), 16);
      const b = parseInt(config.bgHex.slice(5, 7), 16);

      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([2, 2], 0);
      
      // Dibujar radio circular transparente (jsPDF no soporta opacidad en fill fácil, así que solo borde)
      doc.circle(absX, absY, radiusMm, 'S');
      
      // Restaurar línea sólida
      doc.setLineDashPattern([], 0);
    }

    // Dibujar Círculo del Icono
    doc.setFillColor(config.bgHex);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.circle(absX, absY, ICON_RADIUS_MM, 'DF'); // Draw & Fill

    // Dibujar Letra
    const type = ext.extinguisherData?.type;
    const mainLetter = type === 'PQS_ABC' ? 'ABC' : type === 'CLEAN_AGENT' ? 'C' : type === 'AFFF' ? 'AB' : config.letter;
    
    doc.setTextColor(config.textHex);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(mainLetter.length > 2 ? 6.5 : 8);
    // Ajustar 'Y' ligeramente por la fuente para centrar
    doc.text(mainLetter, absX, absY + (mainLetter.length > 2 ? 1 : 1.2), { align: 'center', baseline: 'middle' });
  });

  // 4. Dibujar Leyenda (Bottom Left del plano o debajo)
  if (legendTypes.size > 0) {
    const legendWidth = 60;
    const legendHeight = 10 + (legendTypes.size * 8);
    const legendX = startX + 5;
    const legendY = startY + finalImgH - legendHeight - 5;

    // Fondo blanco semi-transparente para leyenda
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(legendX, legendY, legendWidth, legendHeight, 'DF');

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('SIMBOLOGÍA EXTINTORES', legendX + 5, legendY + 6);

    let curY = legendY + 12;
    Array.from(legendTypes).forEach(type => {
      const config = CLASS_CONFIG[type as keyof typeof CLASS_CONFIG];
      
      doc.setFillColor(config.bgHex);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.2);
      doc.circle(legendX + 8, curY - 1, 2.5, 'DF');

      doc.setTextColor(config.textHex);
      doc.setFontSize(6);
      doc.text(config.letter, legendX + 8, curY - 0.5, { align: 'center', baseline: 'middle' });

      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`${config.title} (${config.subtitle})`, legendX + 13, curY);

      curY += 8;
    });
  }

  // 5. Pie de página
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Generado por Low Voltage Estimator el ${new Date().toLocaleDateString('es-MX')} a las ${new Date().toLocaleTimeString('es-MX')}`,
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );
  if (options.includeRadii) {
    doc.text(
      'Nota: Las líneas punteadas representan los radios de cobertura normativos (15m/30m).',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // 6. Descarga y Exportación
  const cleanName = (options.projectName || "Sembrado_Extintores").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  const filename = `${cleanName}_${floorplan.name.replace(/\s+/g, "_")}.pdf`;

  // Descarga directa clásica que es universalmente compatible y no pierde el contexto de interacción
  doc.save(filename);
}
