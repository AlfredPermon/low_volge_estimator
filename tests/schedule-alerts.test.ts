import { describe, it } from "node:test";
import assert from "node:assert";
import { computeScheduleAlerts } from "@/lib/schedule/schedule-alerts";

describe("schedule-alerts", () => {
  it("alerta comparativa menor a 2 semanas", () => {
    const requested = new Date("2026-01-01T00:00:00.000Z");
    const minExpected = new Date("2026-01-10T00:00:00.000Z");

    const alerts = computeScheduleAlerts({
      engineeringStatus: "",
      engineeringJustification: "",
      procurement: {
        comparativeRequestedAt: requested,
        comparativeMinExpectedAt: minExpected,
        supplierName: "",
        requisitionNumber: "",
        purchaseOrderNumber: "",
        advanceReleasedAt: null,
      },
      activities: [],
      now: new Date("2026-01-05T00:00:00.000Z"),
    });

    assert.ok(alerts.some((a) => a.key === "procurement_comparative_less_than_2w"));
  });
});

