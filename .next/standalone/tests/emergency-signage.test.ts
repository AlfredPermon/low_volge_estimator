import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  EmergencySignDevice,
  EmergencySignDeviceSchema,
} from '../src/types/emergencySignage';
import {
  calculateNOM026Dimensions,
  calculateArrowDirection,
  validateEmergencySignNormative,
  generateEmergencySignageReport,
} from '../src/lib/emergencyNormativeValidator';

describe('Emergency Signage — Validación y Cálculo NOM-026-STPS-2008', () => {
  it('Zod Schema: valida correctamente un objeto EmergencySignDevice', () => {
    const validDevice: EmergencySignDevice = {
      id: 'emg_1',
      x: 120,
      y: 240,
      planoId: 'fp_pb',
      category: 'SALIDA_DE_EMERGENCIA',
      subType: 'Salida de Emergencia (Puerta Exterior)',
      exitType: 'DIRECT_EXTERIOR',
      viewingDistanceM: 15,
      surfaceAreaM2: 0.1125,
      widthM: 0.474,
      heightM: 0.237,
      mountingHeightM: 2.20,
      distFromCeilingM: 0.30,
      illuminationLux: 50,
      isPhotoluminescent: true,
      material: 'ACRILICO_FOTOLUMINISCENTE',
      mountingType: 'SOBRE_PUERTA',
      isValidLocation: true,
      validationAlerts: [],
    };

    const parsed = EmergencySignDeviceSchema.parse(validDevice);
    assert.strictEqual(parsed.category, 'SALIDA_DE_EMERGENCIA');
    assert.strictEqual(parsed.viewingDistanceM, 15);
    assert.strictEqual(parsed.mountingHeightM, 2.20);
  });

  it('Fórmula NOM-026 (Sección 8.4): S >= L^2 / 2000 calcula superficies y dimensiones 2:1', () => {
    const dims5m = calculateNOM026Dimensions(5, 'RUTA_DE_EVACUACION');
    assert.strictEqual(dims5m.surfaceAreaM2, 0.0125);
    assert.strictEqual(dims5m.surfaceCm2, 125);

    const dims15m = calculateNOM026Dimensions(15, 'RUTA_DE_EVACUACION');
    assert.strictEqual(dims15m.surfaceAreaM2, 0.1125);
    assert.strictEqual(dims15m.surfaceCm2, 1125);
    assert.strictEqual(dims15m.widthCm, 47.4);
    assert.strictEqual(dims15m.heightCm, 23.7);

    const dims20m = calculateNOM026Dimensions(20, 'RUTA_DE_EVACUACION');
    assert.strictEqual(dims20m.surfaceAreaM2, 0.2);
    assert.strictEqual(dims20m.surfaceCm2, 2000);
    assert.strictEqual(dims20m.widthCm, 63.2);
    assert.strictEqual(dims20m.heightCm, 31.6);
  });

  it('Algoritmo Vectorial de Flechas: convierte ángulo (X, Y) a dirección direccional', () => {
    const right = calculateArrowDirection({ x: 0, y: 0 }, { x: 10, y: 0 });
    assert.strictEqual(right.direction, 'RIGHT');
    assert.strictEqual(right.symbol, '→');

    const up = calculateArrowDirection({ x: 0, y: 10 }, { x: 0, y: 0 });
    assert.strictEqual(up.direction, 'UP');
    assert.strictEqual(up.symbol, '↑');

    const left = calculateArrowDirection({ x: 10, y: 0 }, { x: 0, y: 0 });
    assert.strictEqual(left.direction, 'LEFT');
    assert.strictEqual(left.symbol, '←');

    const down = calculateArrowDirection({ x: 0, y: 0 }, { x: 0, y: 10 });
    assert.strictEqual(down.direction, 'DOWN');
    assert.strictEqual(down.symbol, '↓');
  });

  it('Validador Normativo: emite alerta si las dimensiones son inferiores a S >= L^2/2000', () => {
    const smallDevice: EmergencySignDevice = {
      id: 'emg_small',
      x: 100,
      y: 100,
      planoId: 'fp_1',
      category: 'RUTA_DE_EVACUACION',
      subType: 'Ruta de Evacuación',
      viewingDistanceM: 20, // Requiere 2000 cm2 (63.2x31.6cm)
      surfaceAreaM2: 0.01, // Insuficiente (100 cm2)
      widthM: 0.15,
      heightM: 0.07,
      mountingHeightM: 2.20,
      distFromCeilingM: 0.30,
      illuminationLux: 50,
      isPhotoluminescent: true,
      material: 'ACRILICO_FOTOLUMINISCENTE',
      mountingType: 'ADHERIDO_PARED',
      isValidLocation: true,
      validationAlerts: [],
    };

    const v = validateEmergencySignNormative(smallDevice, [smallDevice]);
    assert.strictEqual(v.isValid, false);
    assert.ok(v.alerts.some((a) => a.includes('Dimensiones insuficientes')));
  });

  it('Generador de Reporte BOM: calcula cantidades, porcentaje de cumplimiento y costos MXN', () => {
    const devices: EmergencySignDevice[] = [
      {
        id: 'dev_1',
        x: 10,
        y: 10,
        planoId: 'fp_1',
        category: 'SALIDA_DE_EMERGENCIA',
        subType: 'Salida Exterior',
        viewingDistanceM: 15,
        surfaceAreaM2: 0.1125,
        widthM: 0.474,
        heightM: 0.237,
        mountingHeightM: 2.20,
        distFromCeilingM: 0.30,
        illuminationLux: 50,
        isPhotoluminescent: true,
        material: 'ACRILICO_FOTOLUMINISCENTE',
        mountingType: 'SOBRE_PUERTA',
        isValidLocation: true,
        validationAlerts: [],
      },
      {
        id: 'dev_2',
        x: 50,
        y: 50,
        planoId: 'fp_1',
        category: 'RUTA_DE_EVACUACION',
        subType: 'Flecha Derecha',
        arrowDirection: 'RIGHT',
        viewingDistanceM: 15,
        surfaceAreaM2: 0.1125,
        widthM: 0.474,
        heightM: 0.237,
        mountingHeightM: 2.20,
        distFromCeilingM: 0.30,
        illuminationLux: 50,
        isPhotoluminescent: true,
        material: 'ACRILICO_FOTOLUMINISCENTE',
        mountingType: 'ADHERIDO_PARED',
        isValidLocation: true,
        validationAlerts: [],
      },
    ];

    const report = generateEmergencySignageReport(devices);
    assert.strictEqual(report.totalSigns, 2);
    assert.strictEqual(report.byCategory.SALIDA_DE_EMERGENCIA, 1);
    assert.strictEqual(report.byCategory.RUTA_DE_EVACUACION, 1);
    assert.strictEqual(report.compliancePercent, 100);
    assert.ok(report.costs.grandTotalMxn > 0);
  });

  it('Persistencia Store: normalizeFloorplanState reconoce la capa emergency_exit', async () => {
    const { normalizeFloorplanState } = await import('../src/store/estimate-store');

    const rawState = {
      activeFloorplanId: 'fp_1',
      floorplans: [
        {
          id: 'fp_1',
          name: 'Planta Baja',
          devices: [
            {
              id: 'emg_salida_1',
              system: 'emergency_exit',
              subType: 'Salida de Emergencia (Puerta Exterior)',
              x: 200,
              y: 300,
            },
          ],
        },
      ],
    };

    const norm = normalizeFloorplanState(rawState);
    const dev = norm.floorplanConfig.devices[0];

    assert.strictEqual(dev.id, 'emg_salida_1');
    assert.strictEqual(dev.system, 'emergency_exit');
    assert.strictEqual(dev.subType, 'Salida de Emergencia (Puerta Exterior)');
    assert.strictEqual(dev.x, 200);
    assert.strictEqual(dev.y, 300);
  });
});
