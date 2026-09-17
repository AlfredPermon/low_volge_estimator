/**
 * Modelo de Mano de Obra por Cuadrilla (TASK §6, §9.5, §14.4).
 *
 * Permite calcular el costo de mano de obra de un concepto como:
 *   MO = Cantidad × (Tecnicos × tarifaTec + Oficiales × tarifaOf + Ayudantes × tarifaAy) × horasHombre
 *
 * Si useCrewBasedLabor es false, se conserva el cálculo legacy (unitCost × qty).
 */

import { roundByPolicy, type RoundingPolicy } from "./utils";

export interface LaborRates {
  /** MXN por hora-hombre de técnico. Default 950. */
  technician: number;
  /** MXN por hora-hombre de oficial. Default 750. */
  officer: number;
  /** MXN por hora-hombre de ayudante. Default 500. */
  helper: number;
}

export const DEFAULT_LABOR_RATES: LaborRates = {
  technician: 950,
  officer: 750,
  helper: 500,
};

export interface CrewBreakdown {
  /** Cantidad de técnicos por unidad instalada. */
  technicians: number;
  /** Cantidad de oficiales por unidad instalada. */
  officers: number;
  /** Cantidad de ayudantes por unidad instalada. */
  helpers: number;
  /** Horas-hombre totales por unidad. */
  laborHours: number;
}

export interface LaborLineInput {
  quantity: number;
  crew: CrewBreakdown;
  rates: LaborRates;
  policy?: RoundingPolicy;
}

export interface LaborLineResult {
  /** Importe total de mano de obra (MXN). */
  totalLabor: number;
  /** Costo desglosado por rol. */
  costTechnicians: number;
  costOfficers: number;
  costHelpers: number;
  /** Horas-hombre totales. */
  totalHours: number;
  /** Desglose textual para mostrar en la UI (ej: "0.3T + 0.3O + 0.3A × 1.2 h"). */
  crewSummary: string;
}

/**
 * Calcula el costo de mano de obra por cuadrilla.
 *
 *   totalLabor = qty × (T×tarifaTec + O×tarifaOf + A×tarifaAy) × horasHombre
 */
export function computeLaborByCrew(input: LaborLineInput): LaborLineResult {
  const { quantity, crew, rates, policy = 2 } = input;
  const qty = Math.max(0, Number(quantity) || 0);
  const t = Math.max(0, Number(crew.technicians) || 0);
  const o = Math.max(0, Number(crew.officers) || 0);
  const a = Math.max(0, Number(crew.helpers) || 0);
  const h = Math.max(0, Number(crew.laborHours) || 0);
  const rt = Math.max(0, Number(rates.technician) || 0);
  const ro = Math.max(0, Number(rates.officer) || 0);
  const ra = Math.max(0, Number(rates.helper) || 0);

  const costTechnicians = qty * t * rt * h;
  const costOfficers = qty * o * ro * h;
  const costHelpers = qty * a * ra * h;
  const totalLabor = costTechnicians + costOfficers + costHelpers;
  const totalHours = qty * h;

  const r = (n: number) => roundByPolicy(n, policy);
  return {
    totalLabor: r(totalLabor),
    costTechnicians: r(costTechnicians),
    costOfficers: r(costOfficers),
    costHelpers: r(costHelpers),
    totalHours: r(totalHours),
    crewSummary: formatCrewSummary(crew, h, qty),
  };
}

/** Formato de desglose para mostrar en la UI. */
export function formatCrewSummary(crew: CrewBreakdown, hours: number, qty: number): string {
  const parts: string[] = [];
  if (crew.technicians > 0) parts.push(`${crew.technicians}T`);
  if (crew.officers > 0) parts.push(`${crew.officers}O`);
  if (crew.helpers > 0) parts.push(`${crew.helpers}A`);
  if (parts.length === 0) return "—";
  if (hours > 0) {
    return `${parts.join(" + ")} × ${hours} h/u${qty > 1 ? ` × ${qty} u` : ""}`;
  }
  return parts.join(" + ");
}

/** Tarifa por hora-hombre promedio ponderada (referencia). */
export function averageHourlyRate(rates: LaborRates): number {
  return (rates.technician + rates.officer + rates.helper) / 3;
}
