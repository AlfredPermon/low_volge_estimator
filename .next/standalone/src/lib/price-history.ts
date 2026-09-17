import { db } from "@/lib/db";

/**
 * Historial de costos de PriceItem (TASK §18.3, §14.7).
 *
 * Registra cada cambio de `unitCost` con delta, deltaPercent, autor y motivo.
 * Mantiene un máximo de 50 entradas por ítem (estrategia de purga del plan).
 */

export const MAX_HISTORY_PER_ITEM = 50;

export interface PriceHistoryEntry {
  id: string;
  priceItemId: string;
  previousCost: number;
  newCost: number;
  delta: number;
  deltaPercent: number;
  changedBy: string;
  reason: string;
  createdAt: string;
}

export interface RecordChangeInput {
  priceItemId: string;
  previousCost: number;
  newCost: number;
  changedBy?: string;
  reason?: string;
}

/**
 * Registra un cambio de costo en el historial y purga las entradas antiguas.
 * Devuelve la entrada creada o null si no hubo cambio real.
 */
export async function recordPriceChange(input: RecordChangeInput): Promise<PriceHistoryEntry | null> {
  const { priceItemId, previousCost, newCost, changedBy = "", reason = "" } = input;

  // No registrar si no hay cambio real
  if (Math.abs(previousCost - newCost) < 0.0001) return null;

  const delta = round2(newCost - previousCost);
  const deltaPercent = previousCost > 0 ? round2((delta / previousCost) * 100) : 0;

  const created = await db.priceHistory.create({
    data: {
      priceItemId,
      previousCost: round2(previousCost),
      newCost: round2(newCost),
      delta,
      deltaPercent,
      changedBy,
      reason,
    },
  });

  // Purga: mantener solo las últimas MAX_HISTORY_PER_ITEM
  const all = await db.priceHistory.findMany({
    where: { priceItemId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (all.length > MAX_HISTORY_PER_ITEM) {
    const toDelete = all.slice(MAX_HISTORY_PER_ITEM).map((e) => e.id);
    await db.priceHistory.deleteMany({ where: { id: { in: toDelete } } });
  }

  return toEntry(created);
}

/**
 * Devuelve el historial de cambios de un PriceItem ordenado desc por fecha.
 */
export async function getPriceHistory(priceItemId: string): Promise<PriceHistoryEntry[]> {
  const rows = await db.priceHistory.findMany({
    where: { priceItemId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toEntry);
}

/**
 * Elimina todo el historial de un ítem (al borrar el ítem se hace en cascada).
 */
export async function clearPriceHistory(priceItemId: string): Promise<number> {
  const result = await db.priceHistory.deleteMany({ where: { priceItemId } });
  return result.count;
}

function toEntry(row: {
  id: string;
  priceItemId: string;
  previousCost: number;
  newCost: number;
  delta: number;
  deltaPercent: number;
  changedBy: string;
  reason: string;
  createdAt: Date;
}): PriceHistoryEntry {
  return {
    id: row.id,
    priceItemId: row.priceItemId,
    previousCost: row.previousCost,
    newCost: row.newCost,
    delta: row.delta,
    deltaPercent: row.deltaPercent,
    changedBy: row.changedBy,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
