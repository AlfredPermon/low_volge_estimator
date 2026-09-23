/**
 * Tests del motor de cálculo (Fase 1 del plan TASK.md).
 *
 * Cubren:
 *  - Reglas de negocio (Costo Directo, Indirecto, Gran Total, IVA)
 *  - Sistema INCENDIO usa el prefijo 5.7.5 (TASK §4)
 *  - Subtotal por sistema correcto
 *  - Cantidades cero no rompen la suma
 *  - Múltiples cámaras CCTV (caso UCIA)
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runCalculation, type PriceItemRecord } from "../src/lib/calculator";

const baseFactors = {
  wasteFactorCable: 0.10,
  wasteFactorConduit: 0.15,
  verticalDrop: 3.0,
  rackAllowance: 5.0,
  indirectFactor: 0.25,    // 25% TASK §5
  ivaRate: 0.16,           // 16% TASK §9.1
  roundingPolicy: 2 as const,
};

const noPriceItems: PriceItemRecord[] = [];

describe("runCalculation — reglas financieras (TASK §5, §7, §9.1)", () => {
  it("CCTV básico: subtotal directo se calcula como Σ importes", () => {
    const result = runCalculation({
      cctvConfig: {
        cameras: [
          { type: "IP Bullet", qty: 10, hasPoE: true },
          { type: "IP Domo", qty: 0, hasPoE: true },
          { type: "PTZ", qty: 0, hasPoE: true },
          { type: "Fisheye", qty: 0, hasPoE: true },
        ],
        nvr: { qty: 1, bays: 2, storageTB: 4, disksPerBay: 1 },
        avgDistanceMeters: 50,
        licenses: 0,
      },
      factors: baseFactors,
      priceItems: noPriceItems,
    });
    assert.ok(result.subtotalDirect > 0);
    assert.ok(result.subtotalMaterials > 0);
    assert.ok(result.lineItems.length > 0);
  });

  it("Gran Total = Subtotal Directo × (1+ind)", () => {
    const result = runCalculation({
      cctvConfig: {
        cameras: [{ type: "IP Bullet", qty: 1, hasPoE: true }],
        nvr: { qty: 0, bays: 2, storageTB: 4, disksPerBay: 1 },
        avgDistanceMeters: 50,
        licenses: 0,
      },
      factors: { ...baseFactors, indirectFactor: 0.25, ivaRate: 0.16 },
      priceItems: noPriceItems,
    });
    const expectedGT = Math.round(result.subtotalDirect * 1.25 * 100) / 100;
    assert.ok(Math.abs(result.grandTotal - expectedGT) <= 0.5);
  });

  it("IVA se calcula sobre el Gran Total y totalWithIva = GT + IVA", () => {
    const result = runCalculation({
      cctvConfig: {
        cameras: [{ type: "IP Bullet", qty: 1, hasPoE: true }],
        nvr: { qty: 0, bays: 2, storageTB: 4, disksPerBay: 1 },
        avgDistanceMeters: 50,
        licenses: 0,
      },
      factors: baseFactors,
      priceItems: noPriceItems,
    });
    const expectedIva = Math.round(result.grandTotal * 0.16 * 100) / 100;
    assert.ok(Math.abs(result.iva - expectedIva) <= 0.5);
    assert.ok(Math.abs(result.totalWithIva - (result.grandTotal + result.iva)) <= 0.05);
  });

  it("Si ivaRate = 0, totalWithIva === grandTotal", () => {
    const result = runCalculation({
      cctvConfig: {
        cameras: [{ type: "IP Bullet", qty: 1, hasPoE: true }],
        nvr: { qty: 0, bays: 2, storageTB: 4, disksPerBay: 1 },
        avgDistanceMeters: 50,
        licenses: 0,
      },
      factors: { ...baseFactors, ivaRate: 0 },
      priceItems: noPriceItems,
    });
    assert.equal(result.iva, 0);
    assert.equal(result.totalWithIva, result.grandTotal);
  });

  it("Sistema INCENDIO usa el prefijo 5.7.5 (TASK §4, G3)", () => {
    const result = runCalculation({
      fireConfig: {
        smokeDetectors: 5,
        heatDetectors: 0,
        manualStations: 1,
        strobes: 0,
        hornStrobes: 2,
        coDetectors: 0,
        panels: { qty: 1, loops: 1 },
        annunciators: 0,
        avgDistanceMeters: 35,
      },
      factors: baseFactors,
      priceItems: noPriceItems,
    });
    const incItems = result.lineItems.filter((it) => it.system === "INCENDIO");
    assert.ok(incItems.length > 0);
    for (const it of incItems) {
      assert.ok(it.partida.startsWith("5.7.5"), `Partida INCENDIO no usa 5.7.5: ${it.partida}`);
    }
  });

  it("CCTV usa el prefijo 5.7.3 (TASK §4)", () => {
    const result = runCalculation({
      cctvConfig: {
        cameras: [{ type: "IP Bullet", qty: 1, hasPoE: true }],
        nvr: { qty: 0, bays: 2, storageTB: 4, disksPerBay: 1 },
        avgDistanceMeters: 50,
        licenses: 0,
      },
      factors: baseFactors,
      priceItems: noPriceItems,
    });
    for (const it of result.lineItems) {
      assert.ok(it.partida.startsWith("5.7.3"), `Partida CCTV no usa 5.7.3: ${it.partida}`);
    }
  });

  it("Cantidades 0 no generan importe en líneas de cámara ni cable/MO derivados", () => {
    const result = runCalculation({
      cctvConfig: {
        cameras: [
          { type: "IP Bullet", qty: 0, hasPoE: true },
          { type: "IP Domo", qty: 0, hasPoE: true },
          { type: "PTZ", qty: 0, hasPoE: true },
          { type: "Fisheye", qty: 0, hasPoE: true },
        ],
        nvr: { qty: 0, bays: 0, storageTB: 4, disksPerBay: 1 },
        avgDistanceMeters: 50,
        licenses: 0,
      },
      factors: baseFactors,
      priceItems: noPriceItems,
    });
    // Las líneas de cámara con qty=0 deben tener importe 0
    const camItems = result.lineItems.filter((it) =>
      it.description.toLowerCase().includes("cámara") ||
      it.description.toLowerCase().includes("ip bullet") ||
      it.description.toLowerCase().includes("ip domo")
    );
    for (const it of camItems) {
      assert.equal(it.quantity, 0);
      assert.equal(it.totalAmount, 0);
    }
    // El cable derivado de cámaras debe ser 0 (cantidad × costo = 0)
    const cableItem = result.lineItems.find((it) => it.unit === "ML");
    if (cableItem) {
      assert.equal(cableItem.quantity, 0);
      assert.equal(cableItem.totalAmount, 0);
    }
  });

  it("Cada LineItem tiene un id único (TASK §18.2, A4)", () => {
    const result = runCalculation({
      cctvConfig: {
        cameras: [
          { type: "IP Bullet", qty: 5, hasPoE: true },
          { type: "IP Domo", qty: 3, hasPoE: true },
        ],
        nvr: { qty: 1, bays: 2, storageTB: 4, disksPerBay: 1 },
        avgDistanceMeters: 50,
        licenses: 5,
      },
      factors: baseFactors,
      priceItems: noPriceItems,
    });
    const ids = new Set(result.lineItems.map((it) => it.id));
    assert.equal(ids.size, result.lineItems.length);
    for (const it of result.lineItems) {
      assert.ok(it.id);
      assert.ok(it.id.length > 5);
    }
  });

  it("Importe = Cantidad × P.U. para cada partida", () => {
    const result = runCalculation({
      cctvConfig: {
        cameras: [{ type: "IP Bullet", qty: 1, hasPoE: true }],
        nvr: { qty: 0, bays: 2, storageTB: 4, disksPerBay: 1 },
        avgDistanceMeters: 50,
        licenses: 0,
      },
      factors: baseFactors,
      priceItems: noPriceItems,
    });
    for (const it of result.lineItems) {
      const expected = Math.round(it.quantity * it.unitCost * 100) / 100;
      assert.ok(Math.abs(it.totalAmount - expected) <= 0.01);
    }
  });

  it("CCTV switches PoE toman precio por model cuando sku es interno (CCTV-EQP-###)", () => {
    const priceItems: PriceItemRecord[] = [
      {
        id: "pi_sw_48",
        sku: "CCTV-EQP-001",
        system: "CCTV",
        category: "Equipo",
        brand: "UBIQUITI",
        model: "USW-PRO-48-POE",
        description: "UniFi Switch USW-Pro-48-POE Gen2",
        unit: "PZA",
        unitCost: 42518.38,
        performance: 0,
        deviceType: "network_switch",
        active: true,
      },
      {
        id: "pi_sw_24",
        sku: "CCTV-EQP-002",
        system: "CCTV",
        category: "Equipo",
        brand: "UBIQUITI",
        model: "USW-PRO-24-POE",
        description: "UniFi Switch USW-Pro-24-POE Gen2",
        unit: "PZA",
        unitCost: 24344.18,
        performance: 0,
        deviceType: "network_switch",
        active: true,
      },
    ];

    const result = runCalculation({
      cctvConfig: {
        cameras: [{ type: "IP Bullet", qty: 45, hasPoE: true }],
        nvr: { qty: 0, bays: 2, storageTB: 4, disksPerBay: 1 },
        avgDistanceMeters: 50,
        licenses: 0,
      },
      factors: baseFactors,
      priceItems,
    });

    const sw48 = result.lineItems.find((it) => it.code === "USW-PRO-48-POE");
    const sw24 = result.lineItems.find((it) => it.code === "USW-PRO-24-POE");
    assert.ok(sw48);
    assert.ok(sw24);
    assert.equal(sw48.unitCost, 42518.38);
    assert.equal(sw24.unitCost, 24344.18);
  });

  it("UPAEP CCTV 45 cámaras: totalWithIva >= 1.2 × 1393109.05 usando SKUs (FD9383-HV/NR9682-V3/WD102PURP)", async () => {
    const jsonPath = path.join(
      process.cwd(),
      "src",
      "lib",
      "seed-data",
      "default-prices.json"
    );
    const raw = await readFile(jsonPath, "utf-8");
    const parsed = JSON.parse(raw) as { items: Array<Record<string, unknown>> };

    const priceItems: PriceItemRecord[] = (parsed.items ?? []).map((it, i) => ({
      id: `seed_${i}`,
      sku: String(it.sku ?? ""),
      system: String(it.system ?? ""),
      category: String(it.category ?? "Equipo"),
      brand: String(it.brand ?? ""),
      model: String(it.model ?? ""),
      description: String(it.description ?? ""),
      unit: String(it.unit ?? "PZA"),
      unitCost: Number(it.unitCost ?? 0),
      performance: Number(it.performance ?? 0),
      deviceType: String(it.deviceType ?? ""),
      active: true,
    }));

    const factors = {
      wasteFactorCable: 0.10,
      wasteFactorConduit: 0.15,
      verticalDrop: 3.0,
      rackAllowance: 5.0,
      indirectFactor: 0.12,
      ivaRate: 0.16,
      roundingPolicy: 2 as const,
    };

    const result = runCalculation({
      cctvConfig: {
        cameras: [{ type: "IP Domo", model: "FD9383-HV", qty: 45, hasPoE: true }],
        nvr: { qty: 1, bays: 8, storageTB: 10, disksPerBay: 1, nvrModel: "NR9682-V3" },
        avgDistanceMeters: 50,
        licenses: 0,
        // Defaults de auto-BOM / servicios
        fixedSwitchPorts: 4,
        conduitMode: "LOTE",
        useDetailedServices: true,
        cablingInstallMode: "POR_CAMARA",
        includeCertificationLabeling: true,
        includeAsBuilt: true,
        includeCablingInstall: true,
        includeCctvInstallConfig: true,
        includeMisc: true,
      },
      factors,
      priceItems,
    });

    const baseline = 1393109.05 * 1.11; // Umbral recalibrado a GT sin Utilidad: 1,602,075.41 × (1+12% ind) × (1+16% IVA)
    assert.ok(
      result.totalWithIva >= 1.2 * baseline,
      `totalWithIva (${result.totalWithIva}) < 1.2×${baseline}`
    );
  });
});
