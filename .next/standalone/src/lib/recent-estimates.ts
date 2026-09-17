export type RecentEstimateEntry = {
  id: string;
  lastAccessed: number;
};

export function normalizeRecentEstimateEntries(
  input: unknown,
  opts?: { max?: number }
): RecentEstimateEntry[] {
  const max = opts?.max ?? 50;
  if (!Array.isArray(input)) return [];
  const out: RecentEstimateEntry[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const id = (raw as any)?.id;
    const lastAccessed = (raw as any)?.lastAccessed;
    if (typeof id !== "string" || !id) continue;
    if (seen.has(id)) continue;
    const ts = typeof lastAccessed === "number" && Number.isFinite(lastAccessed) ? lastAccessed : 0;
    out.push({ id, lastAccessed: ts });
    seen.add(id);
    if (out.length >= max) break;
  }

  return out
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))
    .slice(0, max);
}

export function touchRecentEstimateEntries(
  entries: RecentEstimateEntry[],
  id: string,
  opts?: { now?: number; max?: number }
): RecentEstimateEntry[] {
  const now = opts?.now ?? Date.now();
  const max = opts?.max ?? 50;
  const next: RecentEstimateEntry[] = [{ id, lastAccessed: now }];
  const seen = new Set<string>([id]);

  for (const e of entries) {
    if (!e?.id || typeof e.id !== "string") continue;
    if (seen.has(e.id)) continue;
    next.push({ id: e.id, lastAccessed: typeof e.lastAccessed === "number" ? e.lastAccessed : 0 });
    seen.add(e.id);
    if (next.length >= max) break;
  }

  return next;
}

export function removeFromRecentEstimateEntries(entries: RecentEstimateEntry[], id: string) {
  return entries.filter((e) => e.id !== id);
}

