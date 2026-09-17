import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Política de redondeo configurable del motor de cálculo (TASK §10, §11.4).
 * `decimals` define los decimales a los que se redondea el valor.
 */
export type RoundingPolicy = 0 | 1 | 2 | 3 | 4

/**
 * Aplica redondeo según la política configurada.
 * Por defecto usa 2 decimales (compatibilidad con implementación previa).
 */
export function roundByPolicy(value: number, policy: RoundingPolicy | number = 2): number {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0
  const decimals = Math.max(0, Math.min(6, Math.floor(policy ?? 2)))
  const factor = Math.pow(10, decimals)
  return Math.round(safe * factor) / factor
}

/** Compatibilidad: alias con el comportamiento previo. */
export const round2 = (n: number): number => roundByPolicy(n, 2)

/**
 * Formatea un número como moneda localizada (TASK §13.2, §17.6).
 * Usa notación es-MX con la moneda indicada.
 */
export function formatCurrency(value: number, currency: "MXN" | "USD" = "MXN"): string {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0
  const locale = currency === "USD" ? "en-US" : "es-MX"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe)
}

