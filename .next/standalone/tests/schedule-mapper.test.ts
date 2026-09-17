import { describe, it } from "node:test";
import assert from "node:assert";
import { generateScheduleActivitiesFromBudget } from "@/lib/schedule/schedule-mapper";

describe("schedule-mapper", () => {
  it("genera actividades por fase según sistemas del presupuesto", () => {
    const activities = generateScheduleActivitiesFromBudget([
      {
        system: "CANALIZACION",
        category: "Consumible",
        description: "Conduit",
        quantity: 100,
        unit: "ML",
        unitCost: 10,
      },
      {
        system: "CABLEADO",
        category: "Consumible",
        description: "UTP",
        quantity: 500,
        unit: "ML",
        unitCost: 5,
      },
      {
        system: "CCTV",
        category: "Equipo",
        description: "Cámara",
        quantity: 10,
        unit: "PZA",
        unitCost: 1000,
      },
      {
        system: "ACCESO",
        category: "Equipo",
        description: "Lectora",
        quantity: 4,
        unit: "PZA",
        unitCost: 800,
      },
    ]);

    const names = activities.map((a) => a.name);
    assert.ok(names.includes("Infraestructura: canalizaciones, cajas y preparaciones"));
    assert.ok(names.includes("Cableado: tendido, etiquetado, remate y pruebas"));
    assert.ok(names.includes("Montaje: instalación y configuración de CCTV"));
    assert.ok(names.includes("Montaje: instalación y configuración de Control de Acceso"));

    const infra = activities.find((a) => a.name.includes("Infraestructura"));
    const cable = activities.find((a) => a.name.includes("Cableado:"));
    assert.strictEqual(infra?.phase, 3);
    assert.strictEqual(cable?.phase, 4);
  });
});

