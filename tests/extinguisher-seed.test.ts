import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ExtinguisherDevice,
  ExtinguisherDeviceSchema,
} from '../src/types/fireProtection';
import {
  validateExtinguisherNormative,
  EXTINGUISHER_CATALOG,
  MEDICAL_AREAS,
} from '../src/lib/fireNormativeValidator';

describe('Extinguisher Seed — Validación Normativa Hospitalaria (NOM-002, NOM-016, NOM-026)', () => {
  it('Zod Schema: valida un objeto ExtinguisherDevice correcto', () => {
    const validDevice: ExtinguisherDevice = {
      id: 'ext_1',
      x: 100,
      y: 200,
      planoId: 'fp_pb',
      type: 'CO2',
      capacity: '5lbs',
      riskZone: 'HIGH_RISK',
      mountingHeight: 1.50,
      signalingHeight: 1.90,
      coverageRadiusMeters: 15.0,
      hasSignaling: true,
      isValidLocation: true,
      validationAlerts: [],
      medicalArea: 'quirofano',
    };

    const parsed = ExtinguisherDeviceSchema.parse(validDevice);
    assert.strictEqual(parsed.type, 'CO2');
    assert.strictEqual(parsed.riskZone, 'HIGH_RISK');
    assert.strictEqual(parsed.mountingHeight, 1.50);
  });

  it('NOM-016-SSA3-2012: Quirófano ACEPTA únicamente CO2 y RECHAZA PQS', () => {
    const co2Device: ExtinguisherDevice = {
      id: 'ext_quirofano_co2',
      x: 100,
      y: 100,
      planoId: 'fp_1',
      type: 'CO2',
      capacity: '5lbs',
      riskZone: 'HIGH_RISK',
      mountingHeight: 1.40,
      signalingHeight: 1.90,
      coverageRadiusMeters: 15.0,
      hasSignaling: true,
      isValidLocation: true,
      validationAlerts: [],
      medicalArea: 'quirofano',
    };

    const v1 = validateExtinguisherNormative(co2Device, [co2Device]);
    assert.strictEqual(v1.isValid, true);
    assert.strictEqual(v1.recommendedType, 'CO2');

    const pqsDevice: ExtinguisherDevice = {
      ...co2Device,
      id: 'ext_quirofano_pqs',
      type: 'PQS_ABC',
      capacity: '6.0kg',
    };

    const v2 = validateExtinguisherNormative(pqsDevice, [pqsDevice]);
    assert.strictEqual(v2.isValid, false);
    assert.ok(v2.alerts.some((a) => a.includes('PROHIBIDO')));
  });

  it('NOM-016-SSA3-2012: Cocina Hospitalaria exige extintor Clase K', () => {
    const classKDevice: ExtinguisherDevice = {
      id: 'ext_cocina_k',
      x: 300,
      y: 300,
      planoId: 'fp_1',
      type: 'CLASS_K',
      capacity: '6L',
      riskZone: 'HIGH_RISK',
      mountingHeight: 1.40,
      signalingHeight: 1.90,
      coverageRadiusMeters: 15.0,
      hasSignaling: true,
      isValidLocation: true,
      validationAlerts: [],
      medicalArea: 'cocina',
    };

    const v = validateExtinguisherNormative(classKDevice, [classKDevice]);
    assert.strictEqual(v.isValid, true);
    assert.strictEqual(v.recommendedType, 'CLASS_K');
  });

  it('NOM-016-SSA3-2012: CEYE y Laboratorios recomiendan Agente Limpio (Solkaflam)', () => {
    const cleanAgentDevice: ExtinguisherDevice = {
      id: 'ext_ceye',
      x: 200,
      y: 200,
      planoId: 'fp_1',
      type: 'CLEAN_AGENT',
      capacity: '4.5kg',
      riskZone: 'HIGH_RISK',
      mountingHeight: 1.35,
      signalingHeight: 1.85,
      coverageRadiusMeters: 15.0,
      hasSignaling: true,
      isValidLocation: true,
      validationAlerts: [],
      medicalArea: 'ceye',
    };

    const v = validateExtinguisherNormative(cleanAgentDevice, [cleanAgentDevice]);
    assert.strictEqual(v.isValid, true);
    assert.strictEqual(v.recommendedType, 'CLEAN_AGENT');
  });

  it('NOM-002-STPS-2010: Alerta si la altura de montaje supera los 1.50m', () => {
    const highDevice: ExtinguisherDevice = {
      id: 'ext_high',
      x: 100,
      y: 100,
      planoId: 'fp_1',
      type: 'PQS_ABC',
      capacity: '6.0kg',
      riskZone: 'ORDINARY_RISK',
      mountingHeight: 1.75, // > 1.50m
      signalingHeight: 1.90,
      coverageRadiusMeters: 30.0,
      hasSignaling: true,
      isValidLocation: true,
      validationAlerts: [],
      medicalArea: 'pasillo',
    };

    const v = validateExtinguisherNormative(highDevice, [highDevice]);
    assert.strictEqual(v.isValid, false);
    assert.ok(v.alerts.some((a) => a.includes('ALTURA EXCEDIDA')));
  });

  it('NOM-026-STPS-2008: Alerta si falta la señalización del extintor', () => {
    const noSignDevice: ExtinguisherDevice = {
      id: 'ext_nosign',
      x: 100,
      y: 100,
      planoId: 'fp_1',
      type: 'PQS_ABC',
      capacity: '6.0kg',
      riskZone: 'ORDINARY_RISK',
      mountingHeight: 1.40,
      signalingHeight: 1.90,
      coverageRadiusMeters: 30.0,
      hasSignaling: false, // Faltante
      isValidLocation: true,
      validationAlerts: [],
      medicalArea: 'pasillo',
    };

    const v = validateExtinguisherNormative(noSignDevice, [noSignDevice]);
    assert.strictEqual(v.isValid, false);
    assert.ok(v.alerts.some((a) => a.includes('FALTA SEÑALIZACIÓN')));
  });

  it('Catálogo Predefinido Comercial: incluye insumos estándar con precios y SKUs', () => {
    assert.ok(EXTINGUISHER_CATALOG.length >= 5);
    const co2Item = EXTINGUISHER_CATALOG.find((c) => c.sku === 'EXT-CO2-4.5KG');
    assert.ok(co2Item);
    assert.strictEqual(co2Item.type, 'CO2');
    assert.strictEqual(co2Item.unitCost, 4000.0);
  });

  it('NOM-002-STPS-2010: Valida distancias entre extintores adaptándose a la escala calibrada', () => {
    const ext1: ExtinguisherDevice = {
      id: 'ext_a',
      x: 0,
      y: 0,
      planoId: 'fp_1',
      type: 'CO2',
      capacity: '5lbs',
      riskZone: 'HIGH_RISK', // Máximo 15m
      mountingHeight: 1.40,
      signalingHeight: 1.90,
      coverageRadiusMeters: 15.0,
      hasSignaling: true,
      isValidLocation: true,
      validationAlerts: [],
      medicalArea: 'quirofano',
    };

    const ext2: ExtinguisherDevice = {
      ...ext1,
      id: 'ext_b',
      x: 200, // 200px de distancia
      y: 0,
    };

    // Con escala 0.05 m/px -> 200px = 10 metros (< 15m max limit -> Valido)
    const vDefaultScale = validateExtinguisherNormative(ext1, [ext1, ext2], 0.05);
    assert.strictEqual(vDefaultScale.isValid, true);
    assert.strictEqual(vDefaultScale.nearestExtinguisherDistanceMeters, 10);

    // Con escala calibrada 0.10 m/px -> 200px = 20 metros (> 15m max limit -> Alerta de distancia)
    const vCalibratedScale = validateExtinguisherNormative(ext1, [ext1, ext2], 0.10);
    assert.strictEqual(vCalibratedScale.isValid, false);
    assert.ok(vCalibratedScale.alerts.some((a) => a.includes('DISTANCIA EXCEDIDA')));
    assert.strictEqual(vCalibratedScale.nearestExtinguisherDistanceMeters, 20);
  });

  it('Persistencia Store: normalizeFloorplanState preserva extinguisherData (Salas de Espera / PQS_ABC) sin mutar a Quirófano', async () => {
    const { normalizeFloorplanState } = await import('../src/store/estimate-store');

    const rawFloorplanState = {
      activeFloorplanId: 'fp_1',
      floorplans: [
        {
          id: 'fp_1',
          name: 'Planta Baja',
          scaleMetersPerPx: 0.05,
          racks: [],
          devices: [
            {
              id: 'ext_espera_pqs',
              system: 'extinguisher',
              subType: 'PQS_ABC 6.0kg',
              x: 150,
              y: 250,
              extinguisherData: {
                type: 'PQS_ABC',
                capacity: '6.0kg',
                riskZone: 'ORDINARY_RISK',
                mountingHeight: 1.40,
                signalingHeight: 1.90,
                coverageRadiusMeters: 30.0,
                hasSignaling: true,
                medicalArea: 'espera',
              },
            },
          ],
        },
      ],
    };

    const norm = normalizeFloorplanState(rawFloorplanState);
    const dev = norm.floorplanConfig.devices[0];

    assert.strictEqual(dev.id, 'ext_espera_pqs');
    assert.strictEqual(dev.system, 'extinguisher');
    assert.ok(dev.extinguisherData);
    assert.strictEqual(dev.extinguisherData?.medicalArea, 'espera');
    assert.strictEqual(dev.extinguisherData?.type, 'PQS_ABC');
    assert.strictEqual(dev.extinguisherData?.capacity, '6.0kg');
    assert.strictEqual(dev.x, 150);
    assert.strictEqual(dev.y, 250);
  });

  it('Persistencia Store: normalizeFloorplanState deserializa correctamente cadenas JSON simples y doblemente escapadas', async () => {
    const { normalizeFloorplanState } = await import('../src/store/estimate-store');

    const rawObject = {
      activeFloorplanId: 'fp_extinguisher_1',
      floorplans: [
        {
          id: 'fp_extinguisher_1',
          name: 'EXTINGUISHER Nivel 2',
          levelId: 'level_n2',
          scaleMetersPerPx: 0.05,
          racks: [],
          devices: [
            {
              id: 'ext_co2_quirofano',
              system: 'extinguisher',
              subType: 'CO2 5lbs',
              x: 400,
              y: 500,
              extinguisherData: {
                type: 'CO2',
                capacity: '5lbs',
                riskZone: 'HIGH_RISK',
                mountingHeight: 1.50,
                signalingHeight: 1.90,
                coverageRadiusMeters: 15.0,
                hasSignaling: true,
                medicalArea: 'quirofano',
              },
            },
          ],
        },
      ],
    };

    // 1. Prueba con JSON String simple
    const jsonString = JSON.stringify(rawObject);
    const normSimple = normalizeFloorplanState(jsonString);
    assert.strictEqual(normSimple.floorplans.length, 1);
    assert.strictEqual(normSimple.floorplans[0].name, 'EXTINGUISHER Nivel 2');
    assert.strictEqual(normSimple.floorplans[0].devices.length, 1);
    assert.strictEqual(normSimple.floorplans[0].devices[0].system, 'extinguisher');
    assert.strictEqual(normSimple.floorplans[0].devices[0].extinguisherData?.type, 'CO2');

    // 2. Prueba con JSON String doblemente escapado
    const doubleJsonString = JSON.stringify(jsonString);
    const normDouble = normalizeFloorplanState(doubleJsonString);
    assert.strictEqual(normDouble.floorplans.length, 1);
    assert.strictEqual(normDouble.floorplans[0].name, 'EXTINGUISHER Nivel 2');
    assert.strictEqual(normDouble.floorplans[0].devices.length, 1);
    assert.strictEqual(normDouble.floorplans[0].devices[0].system, 'extinguisher');
    assert.strictEqual(normDouble.floorplans[0].devices[0].extinguisherData?.type, 'CO2');
  });
});
