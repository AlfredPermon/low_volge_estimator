import {
  EmergencySignDevice,
  NOM026SignCategory,
  ArrowDirection,
  SignMaterial,
  SignMountingType,
} from '@/types/emergencySignage';

// ─── NOM-026-STPS-2008 Color Constants ───────────────────────────────────────
export const NOM026_COLORS = {
  SAFETY_GREEN: {
    name: 'Verde de Seguridad',
    hex: '#00A651',
    pantone: '354C',
    ral: '6032',
    minAreaPercent: 50,
  },
  WHITE_CONTRAST: {
    name: 'Blanco Contraste',
    hex: '#FFFFFF',
    pantone: 'White',
    ral: '9003',
  },
  SAFETY_RED: {
    name: 'Rojo de Seguridad (Extintores/Hidrantes)',
    hex: '#E30613',
    pantone: '186C',
    ral: '3001',
  },
};

// ─── Dimension Calculation Formula (Sección 8.4: S >= L^2 / 2000) ────────────
export function calculateNOM026Dimensions(
  viewingDistanceM: number,
  category: NOM026SignCategory = 'RUTA_DE_EVACUACION'
) {
  // S = L^2 / 2000
  const dist = Math.max(1, viewingDistanceM);
  let surfaceAreaM2 = Math.pow(dist, 2) / 2000;

  // Distancia mínima <= 5m implica al menos 125 cm2 (0.0125 m2)
  if (dist <= 5) {
    surfaceAreaM2 = 0.0125;
  }

  const isSquare = category === 'PRIMEROS_AUXILIOS' || category === 'ZONA_DE_SEGURIDAD';

  let heightM: number;
  let widthM: number;

  if (isSquare) {
    // Relación 1:1
    heightM = Math.sqrt(surfaceAreaM2);
    widthM = heightM;
  } else {
    // Relación Rectangular 2:1 (S = W * H = 2 * H^2 => H = sqrt(S/2))
    heightM = Math.sqrt(surfaceAreaM2 / 2);
    widthM = heightM * 2;
  }

  return {
    surfaceAreaM2,
    surfaceCm2: Math.round(surfaceAreaM2 * 10000),
    heightM: Number(heightM.toFixed(3)),
    widthM: Number(widthM.toFixed(3)),
    heightCm: Number((heightM * 100).toFixed(1)),
    widthCm: Number((widthM * 100).toFixed(1)),
  };
}

// ─── Arrow Directionality Algorithm ──────────────────────────────────────────
export function calculateArrowDirection(
  start: { x: number; y: number },
  target: { x: number; y: number }
): { direction: ArrowDirection; angleDeg: number; symbol: string } {
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  
  // atan2 en radianes, convertido a grados de 0 a 360
  // En canvas HTML, +y va hacia abajo, por lo que invertimos dy para coordenadas cartesianas estándar
  let angle = (Math.atan2(-dy, dx) * 180) / Math.PI;
  if (angle < 0) angle += 360;

  let direction: ArrowDirection = 'RIGHT';
  let symbol = '→';

  if (angle >= 337.5 || angle < 22.5) {
    direction = 'RIGHT';
    symbol = '→';
  } else if (angle >= 22.5 && angle < 67.5) {
    direction = 'UP_RIGHT';
    symbol = '↗';
  } else if (angle >= 67.5 && angle < 112.5) {
    direction = 'UP';
    symbol = '↑';
  } else if (angle >= 112.5 && angle < 157.5) {
    direction = 'UP_LEFT';
    symbol = '↖';
  } else if (angle >= 157.5 && angle < 202.5) {
    direction = 'LEFT';
    symbol = '←';
  } else if (angle >= 202.5 && angle < 247.5) {
    direction = 'DOWN_LEFT';
    symbol = '↙';
  } else if (angle >= 247.5 && angle < 292.5) {
    direction = 'DOWN';
    symbol = '↓';
  } else if (angle >= 292.5 && angle < 337.5) {
    direction = 'DOWN_RIGHT';
    symbol = '↘';
  }

  return { direction, angleDeg: Math.round(angle), symbol };
}

// ─── Normative Validator Engine (NOM-026-STPS-2008) ──────────────────────────
export function validateEmergencySignNormative(
  device: EmergencySignDevice,
  allDevices: EmergencySignDevice[],
  scaleMetersPerPx: number = 0.05
): { isValid: boolean; alerts: string[] } {
  const alerts: string[] = [];

  // 1. Verificación de dimensión por distancia de observación (Sección 8.4)
  const dims = calculateNOM026Dimensions(device.viewingDistanceM, device.category);
  if (device.surfaceAreaM2 < dims.surfaceAreaM2 * 0.95) {
    alerts.push(
      `Dimensiones insuficientes: Requiere mín. ${dims.widthCm}x${dims.heightCm}cm (${dims.surfaceCm2}cm²) para distancia de ${device.viewingDistanceM}m.`
    );
  }

  // 2. Verificación de altura de instalación (Sección 8.6)
  if (device.mountingType === 'SOBRE_PUERTA') {
    if (device.mountingHeightM < 1.60 || device.mountingHeightM > 2.50) {
      alerts.push(
        `Señal sobre puerta debe colocarse entre 1.60m y 2.50m (inmediatamente arriba del marco).`
      );
    }
  } else {
    if (device.mountingHeightM < 2.00 || device.mountingHeightM > 2.50) {
      alerts.push(
        `Altura de montaje fuera de norma NOM-026: Debe instalarse entre 2.00m y 2.50m del piso.`
      );
    }
  }

  // 3. Verificación de distancia al techo
  if (device.distFromCeilingM < 0.30) {
    alerts.push(
      `Separación respecto al techo insuficiente: Debe dejar mín. 0.30m de espacio superior.`
    );
  }

  // 4. Verificación de iluminación
  if (device.illuminationLux < 50 && !device.isPhotoluminescent) {
    alerts.push(
      `Iluminación insuficiente (${device.illuminationLux} luxes < 50 luxes): Se exige material fotoluminiscente o lámpara de emergencia.`
    );
  }

  // 5. Verificación de espaciamiento máximo entre señales de ruta (20m en pasillo recto)
  if (device.category === 'RUTA_DE_EVACUACION') {
    const nearbySameCategory = allDevices.filter(
      (d) => d.id !== device.id && d.category === 'RUTA_DE_EVACUACION'
    );
    if (nearbySameCategory.length > 0) {
      let minDistPx = Infinity;
      for (const other of nearbySameCategory) {
        const dx = other.x - device.x;
        const dy = other.y - device.y;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        if (distPx < minDistPx) minDistPx = distPx;
      }
      const minDistMeters = minDistPx * scaleMetersPerPx;
      if (minDistMeters > 20.0) {
        alerts.push(
          `Espaciamiento excesivo (${minDistMeters.toFixed(1)}m > 20m máx): Se requiere señal intermedia en pasillo recto.`
        );
      }
    }
  }

  return {
    isValid: alerts.length === 0,
    alerts,
  };
}

// ─── Estimación de Costos Unitarios MXN ──────────────────────────────────────
export const UNIT_COSTS_MXN: Record<NOM026SignCategory, { material: number; install: number }> = {
  SALIDA_DE_EMERGENCIA: { material: 185.0, install: 65.0 },
  RUTA_DE_EVACUACION: { material: 140.0, install: 55.0 },
  ESCALERA_DE_EMERGENCIA: { material: 165.0, install: 60.0 },
  ZONA_DE_SEGURIDAD: { material: 280.0, install: 85.0 },
  PRIMEROS_AUXILIOS: { material: 150.0, install: 55.0 },
};

// ─── Generador de Reporte y Resumen de Señalización ──────────────────────────
export function generateEmergencySignageReport(devices: EmergencySignDevice[]) {
  const byCategory: Record<NOM026SignCategory, number> = {
    SALIDA_DE_EMERGENCIA: 0,
    RUTA_DE_EVACUACION: 0,
    ESCALERA_DE_EMERGENCIA: 0,
    ZONA_DE_SEGURIDAD: 0,
    PRIMEROS_AUXILIOS: 0,
  };

  let totalMaterialMxn = 0;
  let totalInstallMxn = 0;
  let validCount = 0;

  for (const dev of devices) {
    byCategory[dev.category] = (byCategory[dev.category] || 0) + 1;
    const costs = UNIT_COSTS_MXN[dev.category] || { material: 150, install: 60 };
    totalMaterialMxn += dev.unitCostMxn || costs.material;
    totalInstallMxn += costs.install;
    if (dev.isValidLocation) validCount++;
  }

  const totalCount = devices.length;
  const compliancePercent = totalCount > 0 ? Math.round((validCount / totalCount) * 100) : 100;

  return {
    totalSigns: totalCount,
    byCategory,
    compliancePercent,
    costs: {
      materialsMxn: totalMaterialMxn,
      installMxn: totalInstallMxn,
      grandTotalMxn: totalMaterialMxn + totalInstallMxn,
    },
  };
}
