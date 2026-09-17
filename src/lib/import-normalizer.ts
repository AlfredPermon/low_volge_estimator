/**
 * Normalizador de campos categóricos del Excel de importación (F1).
 *
 * El archivo Excel suele usar nombres en español con acentos, mayúsculas
 * variables, espacios y abreviaturas. Esta utilidad convierte cada valor a
 * la clave canónica del enum (SYSTEMS / CATEGORIES / DEVICE_TYPES), o devuelve
 * `null` si no se reconoce (lo que permite reportar un warning sin abortar
 * la fila completa).
 */

/**
 * Mapa de sinónimos → clave canónica para Sistemas.
 * Las claves se normalizan antes de buscar (lowercase + sin acentos + sin
 * espacios redundantes) para máxima tolerancia.
 */
const SYSTEM_SYNONYMS: Record<string, string> = {
  // CCTV
  cctv: "CCTV",
  "c.c.t.v.": "CCTV",
  "circuito cerrado": "CCTV",
  "circuito cerrado de television": "CCTV",
  "circuito cerrado de televisión": "CCTV",
  videovigilancia: "CCTV",
  "video vigilancia": "CCTV",
  camaras: "CCTV",
  cámaras: "CCTV",
  // ACCESO
  acceso: "ACCESO",
  "control de acceso": "ACCESO",
  "ctrl acceso": "ACCESO",
  "ctrl. acceso": "ACCESO",
  controlacceso: "ACCESO",
  // VOCEO
  voceo: "VOCEO",
  "perifoneo": "VOCEO",
  "perifoneo / pa": "VOCEO",
  "p.a.": "VOCEO",
  "pa": "VOCEO",
  "sonido": "VOCEO",
  "audio": "VOCEO",
  // INCENDIO
  incendio: "INCENDIO",
  "contra incendio": "INCENDIO",
  "deteccion de incendio": "INCENDIO",
  "detección de incendio": "INCENDIO",
  "alarma": "INCENDIO",
  "alarmas": "INCENDIO",
  "fire": "INCENDIO",
  // CANALIZACION
  canalizacion: "CANALIZACION",
  "canalización": "CANALIZACION",
  "canal.": "CANALIZACION",
  "conduit": "CANALIZACION",
  "tuberia": "CANALIZACION",
  "tubería": "CANALIZACION",
  // CABLEADO
  cableado: "CABLEADO",
  "cableado estructurado": "CABLEADO",
  "cables": "CABLEADO",
  // GENERAL
  general: "GENERAL",
  "generales": "GENERAL",
  "servicios generales": "GENERAL",
  "servicio": "GENERAL",
  "servicios": "GENERAL",
  "varios": "GENERAL",
};

/**
 * Mapa de sinónimos para Categorías.
 */
const CATEGORY_SYNONYMS: Record<string, string> = {
  // Equipo
  equipo: "Equipo",
  equipos: "Equipo",
  "dispositivo": "Equipo",
  "dispositivos": "Equipo",
  // Accesorio
  accesorio: "Accesorio",
  accesorios: "Accesorio",
  // Consumible
  consumible: "Consumible",
  consumibles: "Consumible",
  // Mano de Obra
  "mano de obra": "Mano de Obra",
  mo: "Mano de Obra",
  "m.o.": "Mano de Obra",
  "m.o": "Mano de Obra",
  trabajo: "Mano de Obra",
  // Servicio
  servicio: "Servicio",
  servicios: "Servicio",
};

/**
 * Mapa de sinónimos para Unidades (complementa unit-normalizer.ts).
 * Útil para mapear valores como "PZA" / "pz" / "pz." / "piezas" → "PZA".
 */
const UNIT_SYNONYMS: Record<string, string> = {
  pza: "PZA",
  pzas: "PZA",
  pz: "PZA",
  pieza: "PZA",
  piezas: "PZA",
  "pieza(s)": "PZA",
  unidad: "PZA",
  unidades: "PZA",
  u: "PZA",
  ml: "ML",
  "m.l.": "ML",
  mts: "ML",
  mtss: "ML",
  mt: "ML",
  metro: "ML",
  metros: "ML",
  "metro lineal": "ML",
  lote: "LOTE",
  lotes: "LOTE",
  paquete: "LOTE",
  paquetes: "LOTE",
  serv: "SERV",
  servicio: "SERV",
  servicios: "SERV",
  rollo: "ROLLO",
  rollos: "ROLLO",
  kg: "KG",
  kilogramo: "KG",
  kilogramos: "KG",
  m2: "M2",
  m3: "M3",
};

/**
 * Normaliza una cadena: lowercase + sin acentos + colapsa espacios.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Intenta mapear un valor a la clave canónica de un mapa de sinónimos.
 * Devuelve la clave canónica si encuentra coincidencia, o el valor original
 * si no hay sinónimos registrados para esa forma.
 */
function mapWithSynonyms(rawValue: string, synonyms: Record<string, string>): string {
  const trimmed = rawValue.trim();
  if (!trimmed) return trimmed;
  const norm = normalize(trimmed);
  // Coincidencia exacta normalizada
  if (synonyms[norm]) return synonyms[norm];
  // Coincidencia parcial: si el sinónimo normalizado está contenido en el valor
  for (const [key, value] of Object.entries(synonyms)) {
    if (norm.includes(key)) return value;
  }
  // Si el valor ya coincide con alguna clave canónica (case-insensitive),
  // normalizar capitalización
  for (const canonical of Object.values(synonyms)) {
    if (normalize(canonical) === norm) return canonical;
  }
  return trimmed; // Devolver el original para que el validador lo marque
}

/**
 * Normaliza el valor de la columna "Sistema" del Excel.
 * Devuelve el valor mapeado a clave canónica o `null` si no se reconoce.
 *
 * NOTA: si la clave canónica existe (case-correcta) en `validSystems`,
 * siempre se devuelve esa. Si no, se intenta el mapa de sinónimos.
 */
export function normalizeSystemName(
  raw: string,
  validSystems: readonly string[]
): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Coincidencia exacta case-sensitive con el enum válido
  if (validSystems.includes(trimmed)) return trimmed;

  // Coincidencia case-insensitive
  const upperMatch = validSystems.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  if (upperMatch) return upperMatch;

  // Sinónimos
  const mapped = mapWithSynonyms(trimmed, SYSTEM_SYNONYMS);
  if (validSystems.includes(mapped)) return mapped;

  return null;
}

/**
 * Normaliza el valor de la columna "Categoría" del Excel.
 */
export function normalizeCategoryName(
  raw: string,
  validCategories: readonly string[]
): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();

  if (validCategories.includes(trimmed)) return trimmed;
  const exactMatch = validCategories.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) return exactMatch;

  const mapped = mapWithSynonyms(trimmed, CATEGORY_SYNONYMS);
  if (validCategories.includes(mapped)) return mapped;

  return null;
}

/**
 * Normaliza el valor de la columna "Unidad" del Excel.
 * Devuelve la unidad canónica o el valor original si no se reconoce.
 */
export function normalizeUnitName(raw: string): string {
  if (!raw || !raw.trim()) return raw;
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  if (UNIT_SYNONYMS[upper.toLowerCase()]) return UNIT_SYNONYMS[upper.toLowerCase()];
  // Búsqueda parcial
  for (const [key, value] of Object.entries(UNIT_SYNONYMS)) {
    if (upper.toLowerCase().includes(key)) return value;
  }
  return upper; // Devolver en mayúsculas si no se reconoce
}
