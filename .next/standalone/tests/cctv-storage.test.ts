import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { computeNvrDiskPlan } from "../src/lib/cctv-storage";

describe("computeNvrDiskPlan — RAID y capacidad útil (TASK3)", () => {
  it("RAID 5: prioriza menor TB por disco dentro de las bahías disponibles", () => {
    const plan = computeNvrDiskPlan({ requiredUsableTB: 10, maxDisks: 4, raid: "RAID5" });
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.diskNominalTB, 4);
    assert.equal(plan.diskCount, 4);
    assert.ok(plan.totalUsableTB >= 10);
  });

  it("RAID 10: respeta paridad y calcula discos mínimos según TB útil", () => {
    const plan = computeNvrDiskPlan({ requiredUsableTB: 20, maxDisks: 8, raid: "RAID10" });
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.diskNominalTB, 6);
    assert.equal(plan.diskCount, 8);
    assert.ok(plan.totalUsableTB >= 20);
  });

  it("RAID 6: falla si no hay bahías suficientes", () => {
    const plan = computeNvrDiskPlan({ requiredUsableTB: 10, maxDisks: 3, raid: "RAID6" });
    assert.equal(plan.ok, false);
  });
});

