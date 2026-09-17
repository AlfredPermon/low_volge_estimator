import { describe, it } from "node:test";
import assert from "node:assert";
import {
  normalizeSystemName,
  normalizeCategoryName,
  normalizeUnitName,
} from "../src/lib/import-normalizer";
import { SYSTEMS, CATEGORIES } from "../src/lib/constants";

describe("import-normalizer (F1 - fix Sistema inválido)", () => {
  describe("normalizeSystemName", () => {
    it("acepta la clave canónica tal cual", () => {
      assert.strictEqual(normalizeSystemName("CCTV", SYSTEMS), "CCTV");
      assert.strictEqual(normalizeSystemName("INCENDIO", SYSTEMS), "INCENDIO");
      assert.strictEqual(normalizeSystemName("CANALIZACION", SYSTEMS), "CANALIZACION");
    });

    it("normaliza a mayúsculas canónicas", () => {
      assert.strictEqual(normalizeSystemName("cctv", SYSTEMS), "CCTV");
      assert.strictEqual(normalizeSystemName("Incendio", SYSTEMS), "INCENDIO");
      assert.strictEqual(normalizeSystemName("voceo", SYSTEMS), "VOCEO");
    });

    it("reconoce sinónimos en español con acentos", () => {
      assert.strictEqual(normalizeSystemName("Canalización", SYSTEMS), "CANALIZACION");
      assert.strictEqual(normalizeSystemName("Detección de Incendio", SYSTEMS), "INCENDIO");
      assert.strictEqual(normalizeSystemName("Control de Acceso", SYSTEMS), "ACCESO");
      assert.strictEqual(normalizeSystemName("Videovigilancia", SYSTEMS), "CCTV");
      assert.strictEqual(normalizeSystemName("Perifoneo", SYSTEMS), "VOCEO");
    });

    it("reconoce abreviaturas comunes", () => {
      // M.O. no está en el enum de sistemas, devuelve null (fallback GENERAL en la fila)
      assert.strictEqual(normalizeSystemName("M.O.", SYSTEMS), null);
      assert.strictEqual(normalizeSystemName("N/A", SYSTEMS), null);
    });

    it("devuelve null cuando no se reconoce", () => {
      assert.strictEqual(normalizeSystemName("XYZ_Inventado", SYSTEMS), null);
      assert.strictEqual(normalizeSystemName("", SYSTEMS), null);
    });
  });

  describe("normalizeCategoryName", () => {
    it("acepta la clave canónica", () => {
      assert.strictEqual(normalizeCategoryName("Equipo", CATEGORIES), "Equipo");
      assert.strictEqual(normalizeCategoryName("Mano de Obra", CATEGORIES), "Mano de Obra");
    });

    it("reconoce variantes", () => {
      assert.strictEqual(normalizeCategoryName("mano de obra", CATEGORIES), "Mano de Obra");
      assert.strictEqual(normalizeCategoryName("MO", CATEGORIES), "Mano de Obra");
      assert.strictEqual(normalizeCategoryName("consumibles", CATEGORIES), "Consumible");
    });

    it("devuelve null cuando no se reconoce", () => {
      assert.strictEqual(normalizeCategoryName("XYZ_Inventado", CATEGORIES), null);
    });
  });

  describe("normalizeUnitName", () => {
    it("normaliza a forma canónica mayúscula", () => {
      assert.strictEqual(normalizeUnitName("pza"), "PZA");
      assert.strictEqual(normalizeUnitName("piezas"), "PZA");
      assert.strictEqual(normalizeUnitName("ml"), "ML");
      assert.strictEqual(normalizeUnitName("metros"), "ML");
      assert.strictEqual(normalizeUnitName("mts"), "ML");
      assert.strictEqual(normalizeUnitName("lote"), "LOTE");
    });

    it("devuelve mayúsculas para valores no reconocidos", () => {
      assert.strictEqual(normalizeUnitName("xyz"), "XYZ");
    });
  });
});
