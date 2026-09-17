import { addDays, isBefore, isValid } from "date-fns";
import { type EngineeringStatus } from "./schedule-types";

export type ScheduleAlertSeverity = "info" | "warn" | "crit";

export type ScheduleAlert = {
  key: string;
  severity: ScheduleAlertSeverity;
  title?: string;
  message: string;
  action?: string;
};

export type ScheduleActivityLike = {
  id: string;
  name: string;
  status: string;
  endDate: Date | null;
};

export type ProcurementLike = {
  comparativeRequestedAt: Date | null;
  comparativeMinExpectedAt: Date | null;
  supplierName: string;
  requisitionNumber: string;
  purchaseOrderNumber: string;
  advanceReleasedAt: Date | null;
};

export type BlockerLike = {
  id: string;
  activityId: string;
  severity: string;
  releasedAt: Date | null;
};

export type MilestoneLike = {
  id: string;
  name: string;
  status: string;
  targetDate: Date | null;
};

export function computeScheduleAlerts(input: {
  engineeringStatus: EngineeringStatus | "";
  engineeringJustification: string;
  procurement: ProcurementLike | null;
  activities: ScheduleActivityLike[];
  blockers?: BlockerLike[];
  milestones?: MilestoneLike[];
  now?: Date;
}): ScheduleAlert[] {
  const alerts: ScheduleAlert[] = [];
  const now = input.now ?? new Date();

  if (input.engineeringStatus === "EN_PROCESO") {
    alerts.push({
      key: "engineering_in_progress",
      severity: "warn",
      message: "La ingeniería se encuentra en proceso. Costos, cantidades y cronograma pueden variar.",
      action: "Registrar responsable y fecha estimada de entrega; ajustar fechas del plan conforme se aprueben planos.",
    });
  }

  if (input.engineeringStatus === "NO_APLICA") {
    if (!input.engineeringJustification.trim()) {
      alerts.push({
        key: "engineering_no_aplica_no_justificacion",
        severity: "crit",
        message: "Remodelación sin ingeniería seleccionada, pero falta justificación obligatoria.",
        action: "Capturar justificación de no aplicabilidad.",
      });
    }
  }

  if (input.engineeringStatus === "NO_REQUERIDO") {
    if (!input.engineeringJustification.trim()) {
      alerts.push({
        key: "engineering_no_requerido_sin_nota",
        severity: "info",
        message: "Proyecto sin ingeniería formal. Se recomienda documentar la nota de estimación preliminar.",
        action: "Capturar nota/justificación para trazabilidad.",
      });
    }
  }

  const p = input.procurement;
  if (p) {
    const req = p.comparativeRequestedAt;
    const minExpected = p.comparativeMinExpectedAt;

    if (req && isValid(req)) {
      const min = addDays(req, 14);
      if (minExpected && isValid(minExpected) && isBefore(minExpected, min)) {
        alerts.push({
          key: "procurement_comparative_less_than_2w",
          severity: "warn",
          message: "La comparativa se programó en menos de 2 semanas desde la solicitud.",
          action: "Revisar el cronograma o justificar excepción con Cadena de Suministro.",
        });
      }
    }

    const needsSupplier = !p.supplierName.trim();
    const needsReq = !p.requisitionNumber.trim();
    const needsPO = !p.purchaseOrderNumber.trim();

    if (needsSupplier) {
      alerts.push({
        key: "procurement_missing_supplier",
        severity: "warn",
        message: "No existe proveedor ganador registrado.",
        action: "Registrar proveedor ganador y condiciones.",
      });
    }
    if (needsReq) {
      alerts.push({
        key: "procurement_missing_requisition",
        severity: "warn",
        message: "No existe requisición registrada.",
        action: "Capturar requisición para habilitar compra.",
      });
    }
    if (needsPO) {
      alerts.push({
        key: "procurement_missing_po",
        severity: "warn",
        message: "No existe orden de compra registrada.",
        action: "Capturar orden de compra para habilitar compra.",
      });
    }
    if (!p.advanceReleasedAt) {
      alerts.push({
        key: "procurement_missing_advance",
        severity: "info",
        message: "No existe anticipo liberado registrado (cuando aplique).",
        action: "Registrar fecha de liberación de anticipo o confirmar que no aplica.",
      });
    }
  }

  for (const a of input.activities) {
    if (!a.endDate) continue;
    if (!isValid(a.endDate)) continue;
    if (a.status === "Terminado") continue;
    if (isBefore(a.endDate, now)) {
      alerts.push({
        key: `activity_delayed_${a.id}`,
        severity: "warn",
        title: "Actividad retrasada",
        message: `${a.name} tiene fecha de fin en el pasado y no está marcada como Terminada.`,
        action: "Ajustar fechas, registrar bloqueo o actualizar estado/avance.",
      });
    }
  }

  // ── Blockers ──────────────────────────────────────────────────────────
  const blockers = input.blockers ?? [];
  const activeBlockers = blockers.filter((b) => !b.releasedAt);
  if (activeBlockers.length > 0) {
    const hasCrit = activeBlockers.some((b) => b.severity === "critical");
    const hasHigh = activeBlockers.some((b) => b.severity === "high");
    alerts.push({
      key: "active_blockers",
      severity: hasCrit ? "crit" : hasHigh ? "crit" : "warn",
      title: `${activeBlockers.length} bloqueo(s) activo(s)`,
      message: activeBlockers.length === 1
        ? "Hay 1 bloqueo activo que impide el avance de una actividad."
        : `Hay ${activeBlockers.length} bloqueos activos que impiden el avance de actividades.`,
      action: "Revisar y liberar los bloqueos en la pestaña Bloqueos.",
    });
  }

  // ── Milestones overdue ──────────────────────────────────────────────────
  const milestones = input.milestones ?? [];
  for (const m of milestones) {
    if (m.status === "completed") continue;
    if (!m.targetDate) continue;
    if (!isValid(m.targetDate)) continue;
    if (isBefore(m.targetDate, now)) {
      alerts.push({
        key: `milestone_overdue_${m.id}`,
        severity: "warn",
        title: "Hito vencido",
        message: `El hito "${m.name}" venció el ${m.targetDate.toLocaleDateString("es-MX")} y aún no está cumplido.`,
        action: "Revisar причины y actualizar el estado del hito.",
      });
    }
  }

  // ── Procurement: release for installation check ────────────────────────
  const proc = input.procurement;
  if (proc) {
    const hasSupplier = proc.supplierName.trim().length > 0;
    const hasReq = proc.requisitionNumber.trim().length > 0;
    const hasPO = proc.purchaseOrderNumber.trim().length > 0;
    if (hasSupplier && hasReq && hasPO && !proc.advanceReleasedAt) {
      alerts.push({
        key: "procurement_missing_advance",
        severity: "warn",
        title: "Anticipo pendiente de liberar",
        message: "Existe proveedor, requisición y OC, pero falta registrar la liberación del anticipo.",
        action: "Registrar la fecha de liberación de anticipo o confirmar que no aplica.",
      });
    }
  }

  return alerts;
}

