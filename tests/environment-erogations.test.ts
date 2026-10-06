import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  buildEnvironmentDisbursementPlan,
  distributeFrontLoadedMonthly,
  distributeLinearMonthly,
} from "../src/lib/environment-erogations";

describe("environment-erogations", () => {
  it("distribuye inmobiliario/equipo con anticipo 60/40", () => {
    const flow = distributeFrontLoadedMonthly(100000, 4);
    assert.deepEqual(flow, [60000, 13333.34, 13333.33, 13333.33]);
  });

  it("distribuye RRHH de forma lineal y conserva el total", () => {
    const flow = distributeLinearMonthly(60000, 6);
    assert.deepEqual(flow, [10000, 10000, 10000, 10000, 10000, 10000]);
  });

  it("genera una tabla mensual con acumulado y meses extra para RRHH", () => {
    const plan = buildEnvironmentDisbursementPlan({
      durationMonths: 4,
      humanResMonths: 6,
      startDate: "2026-01-15",
      categoryTotals: {
        inmobiliario: 100000,
        equipo: 50000,
        rrhh: 60000,
      },
    });

    assert.equal(plan.rows.length, 6);
    assert.equal(plan.rows[0]?.monthLabel, "Mes 1");
    assert.equal(plan.rows[0]?.periodLabel, "Ene 2026");
    assert.equal(plan.rows[0]?.inmobiliario, 60000);
    assert.equal(plan.rows[0]?.equipo, 30000);
    assert.equal(plan.rows[0]?.rrhh, 10000);
    assert.equal(plan.rows[0]?.totalMonthly, 100000);

    assert.equal(plan.rows[4]?.inmobiliario, 0);
    assert.equal(plan.rows[4]?.equipo, 0);
    assert.equal(plan.rows[4]?.rrhh, 10000);

    assert.equal(plan.rows[5]?.cumulativeTotal, 210000);
    assert.equal(plan.totals.grandTotal, 210000);
    assert.equal(plan.summary.peakMonthIndex, 1);
  });
});
