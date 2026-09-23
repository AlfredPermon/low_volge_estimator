import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFloorplanState } from '../src/store/estimate-store';
import { runCalculation, getFloorplansList, type EstimateFactors } from '../src/lib/calculator';

describe('Multi-Floorplan Project Persistence and Calculation Engine', () => {
  it('normalizes legacy single floorplan config to multi-floorplan structure', () => {
    const legacyConfig = {
      imageUrl: 'http://example.com/plan.png',
      scaleMetersPerPx: 0.05,
      racks: [{ id: 'rack1', name: 'IDF 1', x: 100, y: 100 }],
      devices: [{ id: 'dev1', system: 'cctv', x: 200, y: 200 }],
    };

    const norm = normalizeFloorplanState(legacyConfig);

    assert.equal(norm.floorplans.length, 1);
    assert.equal(norm.activeFloorplanId, norm.floorplans[0].id);
    assert.equal(norm.floorplans[0].imageUrl, 'http://example.com/plan.png');
    assert.equal(norm.floorplans[0].devices.length, 1);
  });

  it('normalizes multi-floorplan project config correctly', () => {
    const multiConfig = {
      activeFloorplanId: 'fp_2',
      floorplans: [
        {
          id: 'fp_1',
          name: 'Planta Baja',
          scaleMetersPerPx: 0.05,
          racks: [{ id: 'r1', name: 'IDF 1', x: 50, y: 50 }],
          devices: [{ id: 'd1', system: 'cctv', x: 100, y: 100 }],
        },
        {
          id: 'fp_2',
          name: 'Planta Alta',
          scaleMetersPerPx: 0.05,
          racks: [{ id: 'r2', name: 'IDF 2', x: 60, y: 60 }],
          devices: [{ id: 'd2', system: 'cctv', x: 120, y: 120 }],
        },
      ],
    };

    const norm = normalizeFloorplanState(multiConfig);

    assert.equal(norm.floorplans.length, 2);
    assert.equal(norm.activeFloorplanId, 'fp_2');
    assert.equal(norm.floorplanConfig.id, 'fp_2');
    assert.equal(norm.floorplanConfig.name, 'Planta Alta');
  });

  it('extracts floorplans list reliably via getFloorplansList', () => {
    const multiConfig = {
      activeFloorplanId: 'fp_1',
      floorplans: [
        { id: 'fp_1', name: 'PB', devices: [{ id: 'd1', system: 'cctv' }] },
        { id: 'fp_2', name: 'PA', devices: [{ id: 'd2', system: 'cctv' }] },
      ],
    };

    const list = getFloorplansList(multiConfig);
    assert.equal(list.length, 2);
    assert.equal(list[0].id, 'fp_1');
    assert.equal(list[1].id, 'fp_2');
  });

  it('aggregates spatial trajectories across all floorplans in a multi-floorplan project', () => {
    const factors: EstimateFactors = {
      wasteFactorCable: 0.1,
      wasteFactorConduit: 0.15,
      verticalDrop: 3.0,
      rackAllowance: 5.0,
      indirectFactor: 0.12,
      roundingPolicy: 2,
      ivaRate: 0.16,
    };

    const multiFloorplanConfig = {
      activeFloorplanId: 'fp_1',
      floorplans: [
        {
          id: 'fp_1',
          name: 'Planta Baja',
          scaleMetersPerPx: 0.1,
          racks: [{ id: 'r1', name: 'IDF 1', x: 100, y: 100 }],
          devices: [{ id: 'cam_pb', system: 'cctv', x: 300, y: 100 }], // ~32.5m
        },
        {
          id: 'fp_2',
          name: 'Planta Alta',
          scaleMetersPerPx: 0.1,
          racks: [{ id: 'r2', name: 'IDF 2', x: 100, y: 100 }],
          devices: [{ id: 'cam_pa', system: 'cctv', x: 300, y: 100 }], // ~32.5m
        },
      ],
    };

    const res = runCalculation({
      cctvConfig: {
        cameras: [{ type: 'IP Bullet', qty: 2, hasPoE: true }],
        nvr: { qty: 1, bays: 2 },
        avgDistanceMeters: 50,
        licenses: 0,
      },
      factors,
      priceItems: [],
      floorplanConfig: multiFloorplanConfig as any,
    });

    assert.ok(res.systems['CCTV']);
    assert.ok(res.lineItems.length > 0);
  });

  it('updates active floorplan image via setFloorplanImage without throwing ReferenceError', () => {
    const { useEstimateStore } = require('../src/store/estimate-store');
    const store = useEstimateStore.getState();

    store.setFloorplanImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');

    const updatedState = useEstimateStore.getState();
    assert.ok(updatedState.floorplanConfig.imageUrl.startsWith('data:image/png;base64'));
    assert.equal(updatedState.floorplans[0].imageUrl, updatedState.floorplanConfig.imageUrl);
  });

  it('calculates system 2.5D metrics breakdown and consolidated grand total correctly', () => {
    const { calculateSystemMetricsBreakdown } = require('../src/lib/calculator');

    const multiLevelConfig = {
      buildingLevels: [
        { id: 'level_pb', name: 'Planta Baja (PB)', code: 'PB', order: 1 },
        { id: 'level_n2', name: 'Nivel 2 (N2)', code: 'N2', order: 2 },
        { id: 'level_n3', name: 'Nivel 3 (N3)', code: 'N3', order: 3 },
        { id: 'level_n4', name: 'Nivel 4 (N4)', code: 'N4', order: 4 },
        { id: 'level_az5', name: 'Azotea 5', code: 'AZ5', order: 5 },
      ],
      floorplans: [
        {
          id: 'fp_pb',
          name: 'Planta Baja',
          levelId: 'level_pb',
          scaleMetersPerPx: 0.1,
          racks: [{ id: 'r1', name: 'IDF PB', x: 50, y: 50 }],
          devices: [
            { id: 'cam1', system: 'cctv', subType: 'IP Bullet', x: 200, y: 50 },
            { id: 'acc1', system: 'access', subType: 'Lector Biométrico', x: 150, y: 50 },
          ],
        },
        {
          id: 'fp_n2',
          name: 'Nivel 2',
          levelId: 'level_n2',
          scaleMetersPerPx: 0.1,
          racks: [{ id: 'r2', name: 'IDF N2', x: 50, y: 50 }],
          devices: [
            { id: 'pag1', system: 'paging', subType: 'Bocina Plafón', x: 180, y: 50 },
            { id: 'fire1', system: 'fire', subType: 'Detector de Humo', x: 220, y: 50 },
          ],
        },
      ],
    };

    const breakdown = calculateSystemMetricsBreakdown(multiLevelConfig, 2.5, 4.0);

    assert.ok(breakdown.bySystem.cctv);
    assert.equal(breakdown.bySystem.cctv.deviceCount, 1);
    assert.equal(breakdown.bySystem.access.deviceCount, 1);
    assert.equal(breakdown.bySystem.paging.deviceCount, 1);
    assert.equal(breakdown.bySystem.fire.deviceCount, 1);

    assert.equal(breakdown.grandTotal.grandTotalDevicesCount, 4);
    assert.ok(breakdown.grandTotal.grandTotalCableMeters > 0);
    assert.ok(breakdown.grandTotal.grandTotalCoveredAreaM2 > 0);
  });
});
