export type RaidType = "NONE" | "RAID1" | "RAID5" | "RAID6" | "RAID10";

const STANDARD_DISK_SIZES_TB = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;
const USABLE_RATIO = 0.91;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function usableTbFromNominal(nominalTb: number) {
  const tb = Number(nominalTb) || 0;
  return round2(tb * USABLE_RATIO);
}

export function raidMinDisks(raid: RaidType) {
  if (raid === "RAID1") return 2;
  if (raid === "RAID5") return 3;
  if (raid === "RAID6") return 4;
  if (raid === "RAID10") return 4;
  return 1;
}

export function raidUsableDiskCount(raid: RaidType, diskCount: number) {
  const n = Math.floor(Number(diskCount) || 0);
  if (raid === "NONE") return n;
  if (raid === "RAID1") return n === 2 ? 1 : null;
  if (raid === "RAID5") return n >= 3 ? n - 1 : null;
  if (raid === "RAID6") return n >= 4 ? n - 2 : null;
  if (raid === "RAID10") return n >= 4 && n % 2 === 0 ? n / 2 : null;
  return null;
}

function pickStandardNominalTbForUsable(usableTbNeeded: number) {
  const need = Number(usableTbNeeded) || 0;
  if (need <= 0) return 0;
  const nominalNeeded = need / USABLE_RATIO;
  for (const s of STANDARD_DISK_SIZES_TB) {
    if (s >= nominalNeeded - 1e-9) return s;
  }
  return null;
}

export type NvrDiskPlan =
  | {
      ok: true;
      diskCount: number;
      diskNominalTB: number;
      diskUsableTB: number;
      totalUsableTB: number;
      raidUsableDisks: number;
    }
  | {
      ok: false;
      error: string;
    };

export function computeNvrDiskPlan(params: {
  requiredUsableTB: number;
  maxDisks: number;
  raid: RaidType;
}): NvrDiskPlan {
  const requiredUsableTB = Number(params.requiredUsableTB) || 0;
  const maxDisks = Math.floor(Number(params.maxDisks) || 0);
  const raid = params.raid;

  if (requiredUsableTB <= 0) {
    return {
      ok: true,
      diskCount: 0,
      diskNominalTB: 0,
      diskUsableTB: 0,
      totalUsableTB: 0,
      raidUsableDisks: 0,
    };
  }

  if (maxDisks <= 0) return { ok: false, error: "No hay bahías disponibles para discos." };

  const minDisks = raidMinDisks(raid);
  if (maxDisks < minDisks) {
    return {
      ok: false,
      error: `El RAID seleccionado requiere mínimo ${minDisks} discos, pero solo hay ${maxDisks} bahía(s) disponible(s).`,
    };
  }

  let best:
    | {
        diskCount: number;
        diskNominalTB: number;
        diskUsableTB: number;
        totalUsableTB: number;
        raidUsableDisks: number;
      }
    | null = null;

  for (let n = minDisks; n <= maxDisks; n += 1) {
    if (raid === "RAID10" && n % 2 !== 0) continue;
    if (raid === "RAID1" && n !== 2) continue;

    const usableDisks = raidUsableDiskCount(raid, n);
    if (usableDisks == null || usableDisks <= 0) continue;

    const usableTbPerDiskNeeded = requiredUsableTB / usableDisks;
    const nominalTb = pickStandardNominalTbForUsable(usableTbPerDiskNeeded);
    if (nominalTb == null) continue;

    const diskUsableTB = usableTbFromNominal(nominalTb);
    const totalUsableTB = round2(usableDisks * diskUsableTB);

    if (totalUsableTB + 1e-9 < requiredUsableTB) continue;

    const candidate = {
      diskCount: n,
      diskNominalTB: nominalTb,
      diskUsableTB,
      totalUsableTB,
      raidUsableDisks: usableDisks,
    };

    if (!best) {
      best = candidate;
      continue;
    }

    if (candidate.diskNominalTB < best.diskNominalTB) {
      best = candidate;
      continue;
    }

    if (candidate.diskNominalTB === best.diskNominalTB && candidate.diskCount < best.diskCount) {
      best = candidate;
    }
  }

  if (!best) {
    return {
      ok: false,
      error: `No se puede cumplir ${round2(requiredUsableTB)} TB con el RAID seleccionado y ${maxDisks} bahía(s) máximo.`,
    };
  }

  return { ok: true, ...best };
}

