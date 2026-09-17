/**
 * Tests del normalizador de unidades (TASK §11.3) y validadores (TASK §12, §13).
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { normalizeUnit, isCanonicalUnit } from "../src/lib/unit-normalizer";
import { validateLineItems, summarizeAlerts } from "../src/lib/validators";

describe("normalizeUnit", () => {
  it("'m.l.' → 'ML'", () => assert.equal(normalizeUnit("m.l."), "ML"));
  it("'ml' → 'ML'", () => assert.equal(normalizeUnit("ml"), "ML"));
  it("'mts.' → 'ML'", () => assert.equal(normalizeUnit("mts."), "ML"));
  it("'mts' → 'ML'", () => assert.equal(normalizeUnit("mts"), "ML"));
  it("'m' → 'ML'", () => assert.equal(normalizeUnit("m"), "ML"));
  it("'PZA' se mantiene canónica", () => assert.equal(normalizeUnit("PZA"), "PZA"));
  it("'pza.' → 'PZA'", () => assert.equal(normalizeUnit("pza."), "PZA"));
  it("'pz' → 'PZA'", () => assert.equal(normalizeUnit("pz"), "PZA"));
  it("'lote' → 'LOTE'", () => assert.equal(normalizeUnit("lote"), "LOTE"));
  it("'KG' se mantiene canónica", () => assert.equal(normalizeUnit("KG"), "KG"));
  it("vacío → 'PZA' (default)", () => assert.equal(normalizeUnit(""), "PZA"));
  it("null → 'PZA'", () => assert.equal(normalizeUnit(null), "PZA"));
  it("desconocido → uppercase", () => assert.equal(normalizeUnit("xyz"), "XYZ"));
});

describe("isCanonicalUnit", () => {
  it("ML es canónica", () => assert.equal(isCanonicalUnit("ML"), true));
  it("m.l. NO es canónica (debe normalizarse primero)", () =>
    assert.equal(isCanonicalUnit("m.l."), false));
  it("PZA es canónica", () => assert.equal(isCanonicalUnit("PZA"), true));
});

describe("validateLineItems", () => {
  it("Detecta códigos duplicados", () => {
    const items = [
      { id: "a", code: "CCTV-001", system: "CCTV", category: "Equipo" },
      { id: "b", code: "CCTV-001", system: "CCTV", category: "Equipo" },
    ];
    const alerts = validateLineItems(items);
    const dup = alerts.filter((a) => a.code === "code_duplicate");
    assert.equal(dup.length, 2);
    assert.equal(dup[0].severity, "error");
  });

  it("Detecta código único sin alertas de duplicado", () => {
    const items = [
      { id: "a", code: "CCTV-001", system: "CCTV", category: "Equipo" },
      { id: "b", code: "CCTV-002", system: "CCTV", category: "Equipo" },
    ];
    const alerts = validateLineItems(items);
    const dup = alerts.filter((a) => a.code === "code_duplicate");
    assert.equal(dup.length, 0);
  });

  it("Detecta cantidad 0 con costo > 0", () => {
    const items = [
      { id: "a", code: "X-001", system: "CCTV", category: "Equipo", quantity: 0, unitCost: 100 },
    ];
    const alerts = validateLineItems(items);
    const w = alerts.find((a) => a.code === "quantity_zero_with_cost");
    assert.ok(w);
    assert.equal(w?.severity, "warning");
  });

  it("Detecta material en 0 para categoría Equipo", () => {
    const items = [
      { id: "a", code: "X-001", system: "CCTV", category: "Equipo", quantity: 5, unitCost: 0 },
    ];
    const alerts = validateLineItems(items);
    const m = alerts.find((a) => a.code === "material_zero");
    assert.ok(m);
  });

  it("Detecta mano de obra en 0", () => {
    const items = [
      { id: "a", code: "X-001", system: "CCTV", category: "Mano de Obra", quantity: 1, unitCost: 0 },
    ];
    const alerts = validateLineItems(items);
    const m = alerts.find((a) => a.code === "labor_zero");
    assert.ok(m);
  });

  it("Detecta unidad no estándar", () => {
    const items = [
      { id: "a", code: "X-001", system: "CCTV", category: "Equipo", quantity: 1, unitCost: 10, unit: "cubetas" },
    ];
    const alerts = validateLineItems(items);
    const u = alerts.find((a) => a.code === "unit_unknown");
    assert.ok(u);
    assert.equal(u?.severity, "info");
  });

  it("Detecta valores negativos", () => {
    const items = [
      { id: "a", code: "X-001", system: "CCTV", category: "Equipo", quantity: -1, unitCost: 100 },
    ];
    const alerts = validateLineItems(items);
    const n = alerts.find((a) => a.code === "negative_value");
    assert.ok(n);
    assert.equal(n?.severity, "error");
  });

  it("Detecta descripción vacía", () => {
    const items = [
      { id: "a", code: "X-001", system: "CCTV", category: "Equipo", description: "" },
    ];
    const alerts = validateLineItems(items);
    const d = alerts.find((a) => a.code === "description_empty");
    assert.ok(d);
  });

  it("Detecta sistema vacío", () => {
    const items = [
      { id: "a", code: "X-001", category: "Equipo", system: "" },
    ];
    const alerts = validateLineItems(items);
    const s = alerts.find((a) => a.code === "system_empty");
    assert.ok(s);
    assert.equal(s?.severity, "error");
  });

  it("summarizeAlerts cuenta por severidad", () => {
    const items = [
      { id: "a", code: "X-001", system: "CCTV", category: "Equipo", quantity: -1, unitCost: 10 },
      { id: "b", code: "X-002", system: "CCTV", category: "Equipo", quantity: 0, unitCost: 10 },
    ];
    const alerts = validateLineItems(items);
    const s = summarizeAlerts(alerts);
    assert.ok(s.errors >= 1);
    assert.ok(s.warnings >= 1);
    assert.equal(s.total, alerts.length);
  });
});
