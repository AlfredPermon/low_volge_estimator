export interface EnvironmentDisbursementTotals {
  inmobiliario: number;
  equipo: number;
  rrhh: number;
  grandTotal: number;
}

export interface EnvironmentDisbursementRow {
  monthIndex: number;
  monthLabel: string;
  periodLabel: string;
  inmobiliario: number;
  equipo: number;
  rrhh: number;
  totalMonthly: number;
  cumulativeTotal: number;
}

export interface EnvironmentDisbursementSummary {
  peakMonthIndex: number;
  peakMonthLabel: string;
  peakMonthTotal: number;
  firstMonthWeightPct: number;
  averageMonthlyTotal: number;
}

export interface EnvironmentDisbursementPlan {
  rows: EnvironmentDisbursementRow[];
  totals: EnvironmentDisbursementTotals;
  summary: EnvironmentDisbursementSummary;
  durationMonths: number;
  humanResMonths: number;
}

export interface EnvironmentDisbursementInput {
  durationMonths: number;
  humanResMonths?: number;
  startDate?: string | Date | null;
  categoryTotals: {
    inmobiliario?: number;
    equipo?: number;
    rrhh?: number;
  };
}

const MIN_MONTHS = 1;

function normalizeCurrency(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function toCents(value: number): number {
  return Math.round(normalizeCurrency(value) * 100);
}

function fromCents(value: number): number {
  return value / 100;
}

function normalizeMonths(value: number | undefined): number {
  const safe = Math.floor(Number.isFinite(value) ? Number(value) : MIN_MONTHS);
  return Math.max(MIN_MONTHS, safe);
}

function distributeCentsEvenly(totalCents: number, slots: number): number[] {
  if (slots <= 0) return [];

  const base = Math.floor(totalCents / slots);
  let remainder = totalCents - (base * slots);

  return Array.from({ length: slots }, () => {
    const value = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return value;
  });
}

/**
 * Distribuye una partida con salida fuerte al inicio:
 *  - 60% en el primer mes
 *  - 40% restante en los meses posteriores de la obra
 */
export function distributeFrontLoadedMonthly(total: number, durationMonths: number): number[] {
  const months = normalizeMonths(durationMonths);
  const totalCents = toCents(total);

  if (totalCents <= 0) {
    return Array.from({ length: months }, () => 0);
  }

  if (months === 1) {
    return [fromCents(totalCents)];
  }

  const firstMonthCents = Math.round(totalCents * 0.6);
  const remainingCents = totalCents - firstMonthCents;
  const tail = distributeCentsEvenly(remainingCents, months - 1);

  return [fromCents(firstMonthCents), ...tail.map(fromCents)];
}

/**
 * Distribución lineal para costos recurrentes como RRHH.
 */
export function distributeLinearMonthly(total: number, months: number): number[] {
  const normalizedMonths = normalizeMonths(months);
  const totalCents = toCents(total);

  if (totalCents <= 0) {
    return Array.from({ length: normalizedMonths }, () => 0);
  }

  return distributeCentsEvenly(totalCents, normalizedMonths).map(fromCents);
}

function buildPeriodLabel(startDate: string | Date | null | undefined, offset: number): string {
  if (!startDate) {
    return `Periodo ${offset + 1}`;
  }

  const base = new Date(startDate);
  if (Number.isNaN(base.getTime())) {
    return `Periodo ${offset + 1}`;
  }

  const period = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const label = period.toLocaleDateString('es-MX', {
    month: 'short',
    year: 'numeric',
  });

  return label.replace('.', '').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildEnvironmentDisbursementPlan(
  input: EnvironmentDisbursementInput,
): EnvironmentDisbursementPlan {
  const durationMonths = normalizeMonths(input.durationMonths);
  const humanResMonths = normalizeMonths(input.humanResMonths ?? input.durationMonths + 2);
  const totalMonths = Math.max(durationMonths, humanResMonths);

  const inmobiliarioFlow = distributeFrontLoadedMonthly(
    input.categoryTotals.inmobiliario ?? 0,
    durationMonths,
  );
  const equipoFlow = distributeFrontLoadedMonthly(
    input.categoryTotals.equipo ?? 0,
    durationMonths,
  );
  const rrhhFlow = distributeLinearMonthly(
    input.categoryTotals.rrhh ?? 0,
    humanResMonths,
  );

  const totals: EnvironmentDisbursementTotals = {
    inmobiliario: normalizeCurrency(input.categoryTotals.inmobiliario ?? 0),
    equipo: normalizeCurrency(input.categoryTotals.equipo ?? 0),
    rrhh: normalizeCurrency(input.categoryTotals.rrhh ?? 0),
    grandTotal: normalizeCurrency(
      (input.categoryTotals.inmobiliario ?? 0)
      + (input.categoryTotals.equipo ?? 0)
      + (input.categoryTotals.rrhh ?? 0),
    ),
  };

  let cumulativeTotal = 0;

  const rows: EnvironmentDisbursementRow[] = Array.from({ length: totalMonths }, (_, index) => {
    const inmobiliario = inmobiliarioFlow[index] ?? 0;
    const equipo = equipoFlow[index] ?? 0;
    const rrhh = rrhhFlow[index] ?? 0;
    const totalMonthly = inmobiliario + equipo + rrhh;
    cumulativeTotal += totalMonthly;

    return {
      monthIndex: index + 1,
      monthLabel: `Mes ${index + 1}`,
      periodLabel: buildPeriodLabel(input.startDate, index),
      inmobiliario,
      equipo,
      rrhh,
      totalMonthly,
      cumulativeTotal,
    };
  });

  const peakRow = rows.reduce<EnvironmentDisbursementRow | null>((currentPeak, row) => {
    if (!currentPeak || row.totalMonthly > currentPeak.totalMonthly) {
      return row;
    }
    return currentPeak;
  }, rows[0] ?? null);

  return {
    rows,
    totals,
    summary: {
      peakMonthIndex: peakRow?.monthIndex ?? 1,
      peakMonthLabel: peakRow?.monthLabel ?? 'Mes 1',
      peakMonthTotal: peakRow?.totalMonthly ?? 0,
      firstMonthWeightPct: totals.grandTotal > 0 ? ((rows[0]?.totalMonthly ?? 0) / totals.grandTotal) * 100 : 0,
      averageMonthlyTotal: rows.length > 0 ? totals.grandTotal / rows.length : 0,
    },
    durationMonths,
    humanResMonths,
  };
}
