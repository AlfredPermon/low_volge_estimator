/**
 * Normalizador de unidades (TASK §11.3).
 * Mapea variantes comunes (m.l., ml, mts., pza., etc.) a un conjunto canónico.
 */

const UNIT_ALIASES: Record<string, string> = {
  // Longitud
  "ml": "ML",
  "m.l.": "ML",
  "m.l": "ML",
  "m": "ML",
  "mts": "ML",
  "mts.": "ML",
  "metro": "ML",
  "metros": "ML",
  // Pieza
  "pza": "PZA",
  "pza.": "PZA",
  "pz": "PZA",
  "pz.": "PZA",
  "pieza": "PZA",
  "piezas": "PZA",
  "pzas": "PZA",
  "pzas.": "PZA",
  "unidad": "PZA",
  "unidades": "PZA",
  // Lote / servicio
  "lote": "LOTE",
  "lotes": "LOTE",
  "servicio": "SERV",
  "servicios": "SERV",
  // Rollos y otros
  "bobina": "ROLLO",
  "bobinas": "ROLLO",
  "rollo": "ROLLO",
  "rollos": "ROLLO",
  "kg": "KG",
  "kilo": "KG",
  "kilos": "KG",
};

const CANONICAL_UNITS = new Set(["ML", "PZA", "LOTE", "SERV", "ROLLO", "KG", "M2", "M3"]);

/**
 * Normaliza una unidad a su forma canónica.
 * Si la unidad no se reconoce, la devuelve en mayúsculas truncada.
 */
export function normalizeUnit(raw: string | undefined | null): string {
  if (!raw) return "PZA";
  const trimmed = String(raw).trim().toLowerCase();
  if (!trimmed) return "PZA";
  if (UNIT_ALIASES[trimmed]) return UNIT_ALIASES[trimmed];
  // Si ya es canónica (mayúsculas), devuélvela
  const upper = trimmed.toUpperCase();
  if (CANONICAL_UNITS.has(upper)) return upper;
  // Si no se reconoce, devolver en mayúsculas para mantener consistencia
  return upper;
}

/** Verifica si una unidad es canónica. */
export function isCanonicalUnit(unit: string): boolean {
  return CANONICAL_UNITS.has(String(unit).toUpperCase());
}
