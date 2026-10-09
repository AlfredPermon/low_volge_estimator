'use client';

import { jsPDF } from 'jspdf';
import type { FloorplanItem } from '@/store/estimate-store';
import { EmergencySignDevice } from '@/types/emergencySignage';

export interface EmergencyFloorplanPdfOptions {
  includeRadii: boolean;
  projectName?: string;
  floorplanName?: string;
}

const SIGN_GREEN = '#00A651'; // Verde NOM-026

export async function exportEmergencyFloorplanToPDF(
  floorplan: FloorplanItem,
  devices: EmergencySignDevice[],
  options: EmergencyFloorplanPdfOptions
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
  const legendAllocHeight = 15; // Espacio exclusivo reservado para leyenda horizontal abajo del plano
  
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2 - titleHeight - legendAllocHeight - bottomFooterHeight;

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
  doc.setFillColor(0, 166, 81); // Verde NOM-026
  doc.rect(0, 0, pageWidth, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SEMBRADO DE SEÑALIZACIÓN Y RUTAS DE EVACUACIÓN (NOM-026)', margin, 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(options.projectName || 'Proyecto General', pageWidth - margin, 10, { align: 'right' });
  doc.text(`Nivel / Plano: ${options.floorplanName || floorplan.name}`, pageWidth - margin, 15, { align: 'right' });

  // 2. Dibujar Imagen Base del Plano (Compresión JPEG rápida)
  doc.addImage(img, 'JPEG', startX, startY, finalImgW, finalImgH, undefined, 'FAST');

  // Marco sutil para el plano
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(startX, startY, finalImgW, finalImgH);

  // Calcular dimensiones reales del canvas del frontend (basado en KI)
  const aspect = imgWidth / imgHeight;
  const canvasWidth = Math.max(1200, Math.min(imgWidth, 1400));
  const canvasHeight = Math.max(650, Math.round(canvasWidth / aspect));

  // 3. Dibujar Señalética
  // Aumentar el tamaño base del icono a 6.0mm para mayor presencia y legibilidad en A3
  const BASE_RADIUS_MM = 6.0; 
  const legendTypes = new Map<string, { label: string, letter: string }>();

  devices.forEach(dev => {
    const emgData = dev;

    // Coordenadas relativas
    const relX = (dev.x / canvasWidth) * finalImgW;
    const relY = (dev.y / canvasHeight) * finalImgH;
    
    const absX = startX + relX;
    const absY = startY + relY;

    // Escala del icono
    const customScale = emgData.customScale || 1.0;
    const currentRadiusMm = BASE_RADIUS_MM * customScale;

    let label = 'Salida de Emergencia';
    let iconType = emgData.category;
    
    switch (emgData.category) {
      case 'SALIDA_DE_EMERGENCIA': label = 'Salida de Emergencia'; break;
      case 'ESCALERA_DE_EMERGENCIA': label = 'Escalera de Emergencia'; break;
      case 'RUTA_DE_EVACUACION': label = 'Ruta de Evacuación'; break;
      case 'ZONA_DE_SEGURIDAD': label = 'Zona de Seguridad'; break;
      case 'PRIMEROS_AUXILIOS': label = 'Primeros Auxilios'; break;
    }

    if (!legendTypes.has(emgData.category)) {
      legendTypes.set(emgData.category, { label, letter: '' });
    }

    // Dibujar Radio Visual (si está activo)
    if (options.includeRadii && emgData.viewingDistanceM) {
      const radiusPx = emgData.viewingDistanceM / floorplan.scaleMetersPerPx;
      const radiusMm = (radiusPx / imgWidth) * finalImgW; 
      doc.setDrawColor(0, 166, 81);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([2, 2], 0);
      doc.circle(absX, absY, radiusMm, 'S');
      doc.setLineDashPattern([], 0);
    }

    // Calcular angulo basado en arrowDirection
    let angleDeg = 0;
    switch (emgData.arrowDirection) {
      case 'RIGHT': angleDeg = 0; break;
      case 'DOWN_RIGHT': angleDeg = 45; break;
      case 'DOWN': angleDeg = 90; break;
      case 'DOWN_LEFT': angleDeg = 135; break;
      case 'LEFT': angleDeg = 180; break;
      case 'UP_LEFT': angleDeg = 225; break;
      case 'UP': angleDeg = 270; break;
      case 'UP_RIGHT': angleDeg = 315; break;
      default: angleDeg = emgData.arrowAngle || 0; break;
    }

    // Dibujar Círculo Verde
    doc.setFillColor(SIGN_GREEN);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.circle(absX, absY, currentRadiusMm, 'DF'); 

    // Dibujar Icono Vectorial Interno
    drawVectorIcon(doc, iconType, absX, absY, currentRadiusMm, angleDeg);
  });

  // 4. Dibujar Leyenda Horizontal (Fuera del Plano)
  if (legendTypes.size > 0) {
    const itemWidth = 55; // Ancho aproximado de cada elemento en la leyenda
    const legendTotalWidth = legendTypes.size * itemWidth;
    
    // Centrar la leyenda horizontalmente en la página
    let currentX = (pageWidth - legendTotalWidth) / 2;
    // Ubicarla justo debajo de la imagen del plano, en el espacio reservado
    const legendY = startY + finalImgH + 5; 

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SIMBOLOGÍA NOM-026:', currentX - 15, legendY + 5, { align: 'right' });

    Array.from(legendTypes.values()).forEach(({ label }) => {
      // Dibujar fondo y contorno para el icono de la leyenda
      doc.setFillColor(SIGN_GREEN);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.circle(currentX + 5, legendY + 3.5, 4.0, 'DF');

      // Buscar el type en el Map original para dibujar el icono
      let cat = 'SALIDA_DE_EMERGENCIA';
      for (let [k, v] of legendTypes.entries()) {
        if (v.label === label) { cat = k; break; }
      }
      
      // Dibujar icono pequeño en la leyenda (sin rotar)
      drawVectorIcon(doc, cat, currentX + 5, legendY + 3.5, 4.0, 0);

      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(label, currentX + 11, legendY + 4.5);

      currentX += itemWidth;
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
      'Nota: Las líneas punteadas verdes representan los radios de visualización según la fórmula S >= L^2/2000.',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // 6. Descarga y Exportación
  const cleanName = (options.projectName || "Senaletica").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  const filename = `${cleanName}_${floorplan.name.replace(/\s+/g, "_")}.pdf`;

  // Descarga directa clásica (Más robusto según KI)
  doc.save(filename);
}

// ─── Funciones Auxiliares de Dibujo Vectorial ────────────────────────────────

function drawVectorIcon(doc: any, category: string, cx: number, cy: number, r: number, angleDeg: number) {
  doc.setFillColor('#FFFFFF');
  doc.setDrawColor('#FFFFFF');
  
  if (category === 'RUTA_DE_EVACUACION') {
    const arrowPts = [
      [-0.5, -0.2], [0.1, -0.2], [0.1, -0.45], [0.7, 0], [0.1, 0.45], [0.1, 0.2], [-0.5, 0.2]
    ];
    drawPoly(doc, arrowPts, cx, cy, r, angleDeg);
  } else if (category === 'PRIMEROS_AUXILIOS') {
    const crossPts = [
      [-0.15, -0.6], [0.15, -0.6], [0.15, -0.15], [0.6, -0.15], [0.6, 0.15], [0.15, 0.15],
      [0.15, 0.6], [-0.15, 0.6], [-0.15, 0.15], [-0.6, 0.15], [-0.6, -0.15], [-0.15, -0.15]
    ];
    drawPoly(doc, crossPts, cx, cy, r, 0); // La cruz no se rota normalmente
  } else if (category === 'ZONA_DE_SEGURIDAD') {
    const arr = [ [-0.15, -0.7], [0.15, -0.7], [0.15, -0.4], [0.35, -0.4], [0, -0.1], [-0.35, -0.4], [-0.15, -0.4] ];
    drawPoly(doc, arr, cx, cy, r, angleDeg);
    drawPoly(doc, arr, cx, cy, r, angleDeg + 90);
    drawPoly(doc, arr, cx, cy, r, angleDeg + 180);
    drawPoly(doc, arr, cx, cy, r, angleDeg + 270);
  } else if (category === 'SALIDA_DE_EMERGENCIA') {
    // Puerta
    drawPoly(doc, [[0.2, -0.6], [0.5, -0.7], [0.5, 0.7], [0.2, 0.6]], cx, cy, r, angleDeg);
    // Flecha pequeña
    drawPoly(doc, [[-0.2, -0.15], [0.25, -0.15], [0.25, -0.3], [0.55, 0], [0.25, 0.3], [0.25, 0.15], [-0.2, 0.15]], cx, cy, r, angleDeg);
    // Persona: Cabeza (Círculo manual mapeado)
    drawRotatedCircle(doc, cx, cy, r, -0.35, -0.4, 0.12, angleDeg);
    // Cuerpo/Piernas
    drawPoly(doc, [
      [-0.4, -0.2], [-0.3, -0.2], [-0.2, 0.1], [-0.1, 0.5], [-0.2, 0.5], [-0.3, 0.2],
      [-0.4, 0.5], [-0.5, 0.5], [-0.4, 0.1]
    ], cx, cy, r, angleDeg);
    // Brazo
    drawPoly(doc, [[-0.5, -0.1], [-0.2, -0.1], [-0.2, 0.0], [-0.5, 0.0]], cx, cy, r, angleDeg);
  } else if (category === 'ESCALERA_DE_EMERGENCIA') {
    // Escaleras
    drawPoly(doc, [
      [-0.6, 0.6], [-0.2, 0.6], [-0.2, 0.2], [0.2, 0.2], [0.2, -0.2], [0.6, -0.2], [0.6, -0.6],
      [0.4, -0.6], [0.4, -0.4], [0.0, -0.4], [0.0, 0.0], [-0.4, 0.0], [-0.4, 0.4], [-0.6, 0.4]
    ], cx, cy, r, angleDeg);
    // Persona
    drawRotatedCircle(doc, cx, cy, r, -0.2, -0.4, 0.1, angleDeg);
    drawPoly(doc, [
      [-0.25, -0.25], [-0.15, -0.25], [-0.05, 0.0], [0.05, 0.2], [-0.05, 0.2], [-0.15, 0.0],
      [-0.25, 0.2], [-0.35, 0.2], [-0.25, -0.0]
    ], cx, cy, r, angleDeg);
    // Flecha direccional
    drawPoly(doc, [[0.2, 0.2], [0.4, 0.2], [0.4, -0.1], [0.7, 0.3], [0.4, 0.7], [0.4, 0.4], [0.2, 0.4]], cx, cy, r, angleDeg);
  } else {
    // Fallback: flecha
    const arrowPts = [[-0.5, -0.2], [0.1, -0.2], [0.1, -0.45], [0.7, 0], [0.1, 0.45], [0.1, 0.2], [-0.5, 0.2]];
    drawPoly(doc, arrowPts, cx, cy, r, angleDeg);
  }
}

function drawPoly(doc: any, pts: number[][], cx: number, cy: number, r: number, angleDeg: number) {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const mapped = pts.map(p => {
    const px = p[0] * r;
    const py = p[1] * r;
    return {
      x: cx + px * cos - py * sin,
      y: cy + px * sin + py * cos
    };
  });
  
  const lines = mapped.slice(1).map((p, i) => [p.x - mapped[i].x, p.y - mapped[i].y]);
  doc.lines(lines, mapped[0].x, mapped[0].y, [1, 1], 'F', true);
}

function drawRotatedCircle(doc: any, cx: number, cy: number, r: number, relX: number, relY: number, radRel: number, angleDeg: number) {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const px = relX * r;
  const py = relY * r;
  const finalX = cx + px * cos - py * sin;
  const finalY = cy + px * sin + py * cos;
  doc.circle(finalX, finalY, radRel * r, 'F');
}
