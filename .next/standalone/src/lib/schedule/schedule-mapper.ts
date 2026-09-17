import { type BudgetLineItemLike, type ScheduleActivityDraft } from "./schedule-types";

type BudgetFacts = {
  hasConduit: boolean;
  hasCable: boolean;
  hasSystems: Record<string, boolean>;
};

function getBudgetFacts(lineItems: BudgetLineItemLike[]): BudgetFacts {
  const hasSystems: Record<string, boolean> = {};

  for (const it of lineItems) {
    const sys = String(it.system || "").trim().toUpperCase();
    if (sys) hasSystems[sys] = true;
  }

  return {
    hasConduit: Boolean(hasSystems["CANALIZACION"]),
    hasCable: Boolean(hasSystems["CABLEADO"]),
    hasSystems,
  };
}

function draft(
  name: string,
  phase: number,
  system: string,
  assigneeRole: string,
  dependsOnNames: string[] = []
): ScheduleActivityDraft {
  return {
    name,
    phase,
    system,
    assigneeRole,
    status: "Pendiente",
    progress: 0,
    dependsOn: JSON.stringify(dependsOnNames),
  };
}

export function generateScheduleActivitiesFromBudget(lineItems: BudgetLineItemLike[]): ScheduleActivityDraft[] {
  const facts = getBudgetFacts(lineItems);

  const activities: ScheduleActivityDraft[] = [];

  activities.push(draft("Definir estatus de ingeniería y planos", 1, "Ingeniería", "Ingeniería"));
  activities.push(draft("Solicitud de comparativa y definición de proveedor", 2, "Suministro", "Cadena de Suministro"));

  if (facts.hasConduit) {
    activities.push(
      draft(
        "Infraestructura: canalizaciones, cajas y preparaciones",
        3,
        "Infraestructura",
        "Instalación",
        ["Definir estatus de ingeniería y planos"]
      )
    );
  }

  if (facts.hasCable) {
    const deps: string[] = [];
    if (facts.hasConduit) deps.push("Infraestructura: canalizaciones, cajas y preparaciones");
    activities.push(
      draft("Cableado: tendido, etiquetado, remate y pruebas", 4, "Cableado", "Instalación", deps)
    );
  }

  const montajeDeps: string[] = [];
  if (facts.hasCable) montajeDeps.push("Cableado: tendido, etiquetado, remate y pruebas");
  if (!facts.hasCable && facts.hasConduit) montajeDeps.push("Infraestructura: canalizaciones, cajas y preparaciones");

  if (facts.hasSystems["CCTV"]) {
    activities.push(draft("Montaje: instalación y configuración de CCTV", 5, "CCTV", "Comisionamiento", montajeDeps));
  }
  if (facts.hasSystems["ACCESO"]) {
    activities.push(
      draft("Montaje: instalación y configuración de Control de Acceso", 5, "Control de acceso", "Comisionamiento", montajeDeps)
    );
  }
  if (facts.hasSystems["VOCEO"]) {
    activities.push(
      draft("Montaje: instalación y configuración de Voceo", 5, "Voceo / audio ambiental", "Comisionamiento", montajeDeps)
    );
  }
  if (facts.hasSystems["INCENDIO"]) {
    activities.push(
      draft("Montaje: instalación y pruebas de Detección de Incendio", 5, "Detección de incendio", "Comisionamiento", montajeDeps)
    );
  }
  if (facts.hasSystems["GENERAL"]) {
    activities.push(draft("Montaje: servicios generales, integración y puesta en marcha", 5, "General", "Comisionamiento", montajeDeps));
  }

  const lastPhaseDeps = activities
    .filter((a) => a.phase === 5)
    .map((a) => a.name);

  activities.push(draft("Pruebas integrales y SAT", 5, "Cierre", "Comisionamiento", lastPhaseDeps));
  activities.push(draft("Capacitación a usuario final", 5, "Cierre", "PM", ["Pruebas integrales y SAT"]));
  activities.push(draft("Entrega final y documentación As Built", 5, "Cierre", "PM", ["Capacitación a usuario final"]));

  return activities;
}

