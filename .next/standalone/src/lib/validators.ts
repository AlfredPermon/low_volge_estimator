/**
 * Validador de partidas (TASK §12, §13).
 * Detecta inconsistencias y emite alertas tipadas para mostrar en la UI.
 */

export type AlertSeverity = "error" | "warning" | "info";

export type AlertCode =
  | "code_duplicate"
  | "quantity_zero_with_cost"
  | "material_zero"
  | "labor_zero"
  | "unit_unknown"
  | "system_empty"
  | "description_empty"
  | "negative_value"
  | "formula_invalid";

export interface ValidationAlert {
  code: AlertCode;
  severity: AlertSeverity;
  message: string;
  /** Identificador de la partida afectada (TASK §18.2). */
  itemId?: string;
  /** Código visible de la partida. */
  itemCode?: string;
  /** Sistema al que pertenece. */
  system?: string;
}

export interface ValidatableLineItem {
  id: string;
  code: string;
  description?: string;
  system?: string;
  category?: string;
  unit?: string;
  quantity?: number;
  unitCost?: number;
}

const KNOWN_UNITS = new Set(["PZA", "ML", "LOTE", "SERV", "ROLLO", "KG", "M2", "M3"]);

/**
 * Valida un conjunto de partidas y devuelve todas las alertas detectadas.
 * Una partida puede tener múltiples alertas asociadas.
 */
export function validateLineItems(items: ValidatableLineItem[]): ValidationAlert[] {
  const alerts: ValidationAlert[] = [];
  if (!Array.isArray(items)) return alerts;

  // Mapa de código → [ids] para detectar duplicados
  const codeMap = new Map<string, ValidatableLineItem[]>();
  for (const item of items) {
    const code = String(item.code || "").trim();
    if (!code) continue;
    const list = codeMap.get(code) ?? [];
    list.push(item);
    codeMap.set(code, list);
  }

  for (const item of items) {
    const id = item.id;
    const code = String(item.code || "").trim();
    const description = String(item.description || "").trim();
    const system = String(item.system || "").trim();
    const unit = String(item.unit || "").trim();
    const quantity = Number(item.quantity) || 0;
    const unitCost = Number(item.unitCost) || 0;
    const category = String(item.category || "");

    // Descripción vacía
    if (!description) {
      alerts.push({
        code: "description_empty",
        severity: "warning",
        message: `El concepto "${code || "(sin código)"}" no tiene descripción.`,
        itemId: id,
        itemCode: code,
        system,
      });
    }

    // Sistema vacío
    if (!system) {
      alerts.push({
        code: "system_empty",
        severity: "error",
        message: `El concepto "${code}" no tiene sistema asignado.`,
        itemId: id,
        itemCode: code,
      });
    }

    // Cantidad 0 con costo definido
    if (quantity === 0 && unitCost > 0) {
      alerts.push({
        code: "quantity_zero_with_cost",
        severity: "warning",
        message: `"${code}" tiene costo, pero la cantidad es cero.`,
        itemId: id,
        itemCode: code,
        system,
      });
    }

    // Material en cero para equipo
    if (
      category === "Equipo" &&
      quantity > 0 &&
      unitCost === 0
    ) {
      alerts.push({
        code: "material_zero",
        severity: "warning",
        message: `"${code}" parece requerir suministro pero su costo es $0.00.`,
        itemId: id,
        itemCode: code,
        system,
      });
    }

    // Mano de obra en cero para instalación
    if (
      category === "Mano de Obra" &&
      quantity > 0 &&
      unitCost === 0
    ) {
      alerts.push({
        code: "labor_zero",
        severity: "warning",
        message: `"${code}" incluye mano de obra pero su costo es $0.00.`,
        itemId: id,
        itemCode: code,
        system,
      });
    }

    // Unidad no reconocida
    if (unit && !KNOWN_UNITS.has(unit.toUpperCase())) {
      alerts.push({
        code: "unit_unknown",
        severity: "info",
        message: `La unidad "${unit}" en "${code}" no es estándar.`,
        itemId: id,
        itemCode: code,
        system,
      });
    }

    // Valores negativos
    if (quantity < 0 || unitCost < 0) {
      alerts.push({
        code: "negative_value",
        severity: "error",
        message: `"${code}" tiene un valor negativo.`,
        itemId: id,
        itemCode: code,
        system,
      });
    }
  }

  // Códigos duplicados
  for (const [code, list] of codeMap.entries()) {
    if (list.length > 1) {
      for (const it of list) {
        alerts.push({
          code: "code_duplicate",
          severity: "error",
          message: `El código "${code}" está duplicado en ${list.length} partidas.`,
          itemId: it.id,
          itemCode: code,
          system: it.system,
        });
      }
    }
  }

  return alerts;
}

/** Resumen agregado de alertas por severidad. */
export function summarizeAlerts(alerts: ValidationAlert[]) {
  return {
    errors: alerts.filter((a) => a.severity === "error").length,
    warnings: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
    total: alerts.length,
  };
}
