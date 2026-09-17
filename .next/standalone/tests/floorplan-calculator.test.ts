import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRealTrajectories,
  runCalculation,
  type NodePoint,
  type FloorplanRackInput,
  type EstimateFactors,
  type PriceItemRecord,
} from '../src/lib/calculator';

describe('Spatial Calculation Engine (3-Layer Floorplan Calculator)', () => {
  const sampleRacks: FloorplanRackInput[] = [
    { id: 'idf_1', name: 'IDF Principal', x: 100, y: 100 },
  ];

  const scaleMetersPerPx = 0.1; // 10px = 1m -> 1px = 0.1m

  it('calculates Manhattan distance with 1.15 orthogonal factor + drop + slack for star topology', () => {
    // Node at (300, 100): dx = 200px = 20m, dy = 0px = 0m
    // Horizontal distance = 20 * 1.15 = 23.0m
    // Drop = 3.0m, Rise = 2.5m, Slack = 4.0m
    // Total per node = 23.0 + 3.0 + 2.5 + 4.0 = 32.5m
    const nodes: NodePoint[] = [
      { id: 'cam_1', system: 'cctv', subType: 'IP Bullet', x: 300, y: 100, verticalDropM: 3.0 },
    ];

    const res = calculateRealTrajectories(nodes, sampleRacks, scaleMetersPerPx, 2.5, 4.0);

    assert.equal(res.cableTotalMeters, 32.5);
    assert.equal(res.totalConduitMeters, 3.0);
    // 32.5m * 1.08 = 35.1m -> 1 spool of 305m
    assert.equal(res.spools305m, 1);
    // 3.0m conduit -> 1 tube of 3m
    assert.equal(res.conduitTubes3m, 1);
    assert.equal(res.boxes4x4Qty, 1);
    assert.equal(res.emtConnectorsQty, 2);
    assert.equal(res.warnings.length, 0);
  });

  it('triggers ANSI/TIA-568 warning when permanent channel exceeds 90m', () => {
    // Node far away at (1000, 1000): dx = 900px = 90m, dy = 900px = 90m
    // Horizontal distance = (90 + 90) * 1.15 = 207m
    // Total cable > 90m -> Should raise warning
    const nodes: NodePoint[] = [
      { id: 'far_cam', system: 'cctv', subType: 'PTZ', x: 1000, y: 1000 },
    ];

    const res = calculateRealTrajectories(nodes, sampleRacks, scaleMetersPerPx, 2.5, 4.0);

    assert.ok(res.warnings.length > 0);
    assert.match(res.warnings[0], /excede el límite de 90m/);
  });

  it('handles closed-loop (SLC) topology for fire detection systems', () => {
    // Rack at (100, 100)
    // N1 at (200, 100): seg1 = dx 10m * 1.15 = 11.5m + drop 1.2m + 1.0m slack = 13.7m
    // N2 at (200, 200): seg2 = dy 10m * 1.15 = 11.5m + drop 1.2m + 1.0m slack = 13.7m
    // Return to Rack (100, 100): dx 10m + dy 10m = 20m * 1.15 = 23m + rise 2.5m + 2.0m = 27.5m
    const nodes: NodePoint[] = [
      { id: 'smk_1', system: 'fire', subType: 'Detector Humo', x: 200, y: 100 },
      { id: 'smk_2', system: 'fire', subType: 'Detector Humo', x: 200, y: 200 },
    ];

    const res = calculateRealTrajectories(nodes, sampleRacks, scaleMetersPerPx, 2.5, 4.0);

    assert.ok(res.cableTotalMeters > 50);
    assert.equal(res.boxes4x4Qty, 2);
  });

  it('seamlessly integrates with runCalculation when floorplanConfig is passed', () => {
    const factors: EstimateFactors = {
      wasteFactorCable: 0.1,
      wasteFactorConduit: 0.15,
      verticalDrop: 3.0,
      rackAllowance: 5.0,
      indirectFactor: 0.12,
      utilityFactor: 0.15,
      roundingPolicy: 2,
      ivaRate: 0.16,
    };

    const priceItems: PriceItemRecord[] = [
      {
        id: 'p1',
        sku: 'PUR6004BU-FE',
        system: 'CCTV',
        category: 'Equipo',
        brand: 'Panduit',
        model: 'Cat6',
        description: 'Cable UTP Cat6',
        unit: 'rollo',
        unitCost: 3500,
        performance: 0,
        deviceType: 'cable_utp',
        active: true,
      },
    ];

    const resWithNodes = runCalculation({
      cctvConfig: {
        cameras: [{ type: 'IP Bullet', qty: 2, hasPoE: true }],
        nvr: { qty: 1, bays: 2, recordingDays: 30 },
        avgDistanceMeters: 50,
        licenses: 0,
      },
      factors,
      priceItems,
      floorplanConfig: {
        scaleMetersPerPx: 0.1,
        racks: sampleRacks,
        devices: [
          { id: 'cam1', system: 'cctv', x: 200, y: 100 },
          { id: 'cam2', system: 'cctv', x: 300, y: 100 },
        ],
      },
    });

    assert.ok(resWithNodes.systems['CCTV']);
    assert.ok(resWithNodes.lineItems.length > 0);
  });
});
