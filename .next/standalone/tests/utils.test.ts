/**
 * Tests del helper de redondeo y normalización de LineItem.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { roundByPolicy, round2 } from "../src/lib/utils";

describe("roundByPolicy", () => {
  it("0 decimales redondea a entero", () => {
    assert.equal(roundByPolicy(123.45, 0), 123);
    assert.equal(roundByPolicy(123.78, 0), 124);
  });

  it("2 decimales (default) redondea a 2 dígitos", () => {
    assert.equal(roundByPolicy(123.4567, 2), 123.46);
    assert.equal(roundByPolicy(123.451, 2), 123.45);
  });

  it("4 decimales conserva precisión", () => {
    assert.equal(roundByPolicy(123.456789, 4), 123.4568);
  });

  it("Maneja 0 correctamente", () => {
    assert.equal(roundByPolicy(0, 2), 0);
    assert.equal(roundByPolicy(0, 0), 0);
  });

  it("Maneja negativos", () => {
    assert.equal(roundByPolicy(-123.4567, 2), -123.46);
  });

  it("Maneja no-numéricos → 0", () => {
    assert.equal(roundByPolicy(NaN, 2), 0);
    assert.equal(roundByPolicy(Infinity, 2), 0);
    // @ts-expect-error - test runtime guard
    assert.equal(roundByPolicy(undefined, 2), 0);
  });

  it("Política fuera de rango se acota a [0, 6]", () => {
    assert.equal(roundByPolicy(1.2345678, 100), 1.234568);
    assert.equal(roundByPolicy(1.2345678, -5), 1);
  });
});

describe("round2 (compatibilidad)", () => {
  it("Redondea a 2 decimales como el comportamiento previo", () => {
    // Casos robustos que no sufren del problema de representación binaria de 1.005
    assert.equal(round2(1.236), 1.24);
    assert.equal(round2(99.999), 100);
    assert.equal(round2(0.125), 0.13);
    assert.equal(round2(2.5), 2.5);
    assert.equal(round2(-3.4567), -3.46);
  });
});
