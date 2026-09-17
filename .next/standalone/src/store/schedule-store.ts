'use client';

import { create } from "zustand";
import { toast } from "sonner";
import { computeScheduleAlerts } from "@/lib/schedule/schedule-alerts";

export type ScheduleActivity = {
  id: string;
  name: string;
  system: string;
  phase: number;
  startDate: string | null;
  endDate: string | null;
  assigneeRole: string;
  status: string;
  progress: number;
  dependsOn: string;
  risk: string;
  notes: string;
};

export type EngineeringDocument = {
  id: string;
  scheduleId: string;
  system: string;
  filename: string;
  filepath: string;
  revision: string;
  status: string;
  uploadedBy: string;
  uploadedAt: string;
  notes: string;
};

export type ProcurementRecord = {
  id: string;
  scheduleId: string;
  comparativeRequestedAt: string | null;
  comparativeMinExpectedAt: string | null;
  comparativeReceivedAt: string | null;
  supplierName: string;
  quotedAmount: number;
  deliveryLeadTimeDays: number;
  paymentTerms: string;
  advancePercent: number;
  requisitionNumber: string;
  purchaseOrderNumber: string;
  advanceReleasedAt: string | null;
  supplierPurchaseStartedAt: string | null;
  materialsReceivedAt: string | null;
  releasedForInstallationAt: string | null;
  status: string;
  notes: string;
};

export type Schedule = {
  id: string;
  estimateId: string;
  startDate: string | null;
  endDate: string | null;
  engineeringStatus: string;
  engineeringResponsible: string;
  engineeringDueDate: string | null;
  engineeringJustification: string;
  notes: string;
  activities: ScheduleActivity[];
  documents: EngineeringDocument[];
  procurement: ProcurementRecord | null;
  blockers: ScheduleBlocker[];
  milestones: ScheduleMilestone[];
};

export type ScheduleAlert = {
  key: string;
  severity: "info" | "warn" | "crit";
  title?: string;
  message: string;
  action?: string;
};

export type ScheduleBlocker = {
  id: string;
  scheduleId: string;
  activityId: string;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  responsible: string;
  createdAt: string;
  releasedAt: string | null;
  releaseNote: string | null;
};

export type ScheduleMilestone = {
  id: string;
  scheduleId: string;
  name: string;
  phase: string;
  targetDate: string | null;
  completedAt: string | null;
  status: "pending" | "completed";
  responsible: string;
  notes: string;
  createdAt: string;
};

function toDateOrNull(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function computeAlertsFromSchedule(schedule: Schedule): ScheduleAlert[] {
  const blockers = (schedule.blockers ?? []).map((b) => ({
    id: b.id,
    activityId: b.activityId,
    severity: b.severity,
    releasedAt: toDateOrNull(b.releasedAt),
  }));
  const milestones = (schedule.milestones ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    status: m.status,
    targetDate: toDateOrNull(m.targetDate),
  }));
  const alerts = computeScheduleAlerts({
    engineeringStatus: (schedule.engineeringStatus as any) ?? "",
    engineeringJustification: schedule.engineeringJustification ?? "",
    procurement: schedule.procurement
      ? {
          comparativeRequestedAt: toDateOrNull(schedule.procurement.comparativeRequestedAt),
          comparativeMinExpectedAt: toDateOrNull(schedule.procurement.comparativeMinExpectedAt),
          supplierName: schedule.procurement.supplierName,
          requisitionNumber: schedule.procurement.requisitionNumber,
          purchaseOrderNumber: schedule.procurement.purchaseOrderNumber,
          advanceReleasedAt: toDateOrNull(schedule.procurement.advanceReleasedAt),
        }
      : null,
    activities: schedule.activities.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      endDate: toDateOrNull(a.endDate),
    })),
    blockers,
    milestones,
  });
  return alerts;
}

type ScheduleStore = {
  schedule: Schedule | null;
  activities: ScheduleActivity[];
  blockers: ScheduleBlocker[];
  milestones: ScheduleMilestone[];
  alerts: ScheduleAlert[];
  loading: boolean;
  creating: boolean;
  saving: boolean;
  uploading: boolean;
  error: string | null;
  loadByEstimateId: (estimateId: string) => Promise<void>;
  createForEstimate: (estimateId: string) => Promise<void>;
  updateSchedule: (
    scheduleId: string,
    patch: Partial<Pick<
      Schedule,
      | "startDate"
      | "endDate"
      | "engineeringStatus"
      | "engineeringResponsible"
      | "engineeringDueDate"
      | "engineeringJustification"
      | "notes"
    >>,
    procurementPatch?: Partial<ProcurementRecord>
  ) => Promise<void>;
  updateActivity: (activityId: string, patch: Partial<ScheduleActivity>) => Promise<void>;
  uploadEngineeringDocument: (
    scheduleId: string,
    file: File,
    meta: { system: string; revision: string; status: string; uploadedBy: string; notes: string }
  ) => Promise<void>;
  getEngineeringDownloadUrl: (docId: string) => string;
  createBlocker: (data: {
    scheduleId: string;
    activityId: string;
    reason: string;
    severity: string;
    responsible: string;
  }) => Promise<void>;
  releaseBlocker: (blockerId: string, releaseNote: string) => Promise<void>;
  deleteBlocker: (blockerId: string) => Promise<void>;
  createMilestone: (data: {
    scheduleId: string;
    name: string;
    phase: string;
    targetDate: string;
    responsible: string;
    notes: string;
  }) => Promise<void>;
  completeMilestone: (milestoneId: string) => Promise<void>;
  deleteMilestone: (milestoneId: string) => Promise<void>;
};

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedule: null,
  activities: [],
  blockers: [],
  milestones: [],
  alerts: [],
  loading: false,
  creating: false,
  saving: false,
  uploading: false,
  error: null,

  loadByEstimateId: async (estimateId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/schedule?estimateId=${encodeURIComponent(estimateId)}`);
      if (res.status === 404) {
        set({ schedule: null, alerts: [] });
        return;
      }
      if (!res.ok) throw new Error("No se pudo cargar el cronograma");
      const json = await res.json();
      const sch: Schedule | null = json.data ?? null;
      set({
        schedule: sch,
        activities: (sch?.activities ?? []) as ScheduleActivity[],
        blockers: (sch?.blockers ?? []) as ScheduleBlocker[],
        milestones: (sch?.milestones ?? []) as ScheduleMilestone[],
        alerts: sch ? computeAlertsFromSchedule(sch) : [],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar cronograma";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ loading: false });
    }
  },

  createForEstimate: async (estimateId) => {
    set({ creating: true, error: null });
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId }),
      });
      if (!res.ok) throw new Error("No se pudo crear el cronograma");
      const json = await res.json();
      const sch: Schedule | null = json.data ?? null;
      set({
        schedule: sch,
        activities: (sch?.activities ?? []) as ScheduleActivity[],
        blockers: (sch?.blockers ?? []) as ScheduleBlocker[],
        milestones: (sch?.milestones ?? []) as ScheduleMilestone[],
        alerts: sch ? computeAlertsFromSchedule(sch) : [],
      });
      toast.success("Cronograma creado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear cronograma";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ creating: false });
    }
  },

  updateSchedule: async (scheduleId, patch, procurementPatch) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch("/api/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, schedule: patch, procurement: procurementPatch }),
      });
      if (!res.ok) throw new Error("No se pudo guardar el cronograma");
      const json = await res.json();
      const sch: Schedule | null = json.data ?? null;
      set({
        schedule: sch,
        activities: (sch?.activities ?? []) as ScheduleActivity[],
        blockers: (sch?.blockers ?? []) as ScheduleBlocker[],
        milestones: (sch?.milestones ?? []) as ScheduleMilestone[],
        alerts: sch ? computeAlertsFromSchedule(sch) : [],
      });
      toast.success("Cronograma actualizado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar cronograma";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ saving: false });
    }
  },

  updateActivity: async (activityId, patch) => {
    const current = get().schedule;
    if (!current) return;

    set({ saving: true, error: null });
    try {
      const res = await fetch(`/api/schedule/activity/${encodeURIComponent(activityId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("No se pudo actualizar la actividad");
      const json = await res.json();
      const updated: ScheduleActivity | null = json.data ?? null;
      if (!updated) return;
      const nextSchedule: Schedule = {
        ...current,
        activities: current.activities.map((a) => (a.id === updated.id ? updated : a)),
      };
      set({ schedule: nextSchedule, alerts: computeAlertsFromSchedule(nextSchedule) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al actualizar actividad";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ saving: false });
    }
  },

  uploadEngineeringDocument: async (scheduleId, file, meta) => {
    set({ uploading: true, error: null });
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("scheduleId", scheduleId);
      fd.set("system", meta.system);
      fd.set("revision", meta.revision);
      fd.set("status", meta.status);
      fd.set("uploadedBy", meta.uploadedBy);
      fd.set("notes", meta.notes);

      const res = await fetch("/api/schedule/engineering/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("No se pudo subir el PDF");
      const json = await res.json();
      const created: EngineeringDocument | null = json.data ?? null;
      const current = get().schedule;
      if (current && created) {
        set({
          schedule: {
            ...current,
            documents: [created, ...current.documents],
          },
        });
      }
      toast.success("Plano subido");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al subir PDF";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ uploading: false });
    }
  },

  getEngineeringDownloadUrl: (docId) => `/api/schedule/engineering/${encodeURIComponent(docId)}/download`,

  createBlocker: async (data) => {
    const current = get().schedule;
    set({ saving: true, error: null });
    try {
      const res = await fetch("/api/schedule/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("No se pudo crear el bloqueo");
      const json = await res.json();
      const created: ScheduleBlocker = json as ScheduleBlocker;
      const nextBlockers = [...(get().blockers ?? []), created];
      set({
        blockers: nextBlockers,
        schedule: current
          ? { ...current, blockers: nextBlockers }
          : null,
      });
      toast.success("Bloqueo creado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear bloqueo";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ saving: false });
    }
  },

  releaseBlocker: async (blockerId, releaseNote) => {
    const current = get().schedule;
    set({ saving: true, error: null });
    try {
      const res = await fetch(`/api/schedule/blockers/${encodeURIComponent(blockerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseNote }),
      });
      if (!res.ok) throw new Error("No se pudo liberar el bloqueo");
      const json = await res.json();
      const updated: ScheduleBlocker = json as ScheduleBlocker;
      const nextBlockers = (get().blockers ?? []).map((b) =>
        b.id === updated.id ? updated : b
      );
      set({
        blockers: nextBlockers,
        schedule: current
          ? { ...current, blockers: nextBlockers }
          : null,
      });
      toast.success("Bloqueo liberado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al liberar bloqueo";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ saving: false });
    }
  },

  deleteBlocker: async (blockerId) => {
    const current = get().schedule;
    set({ saving: true, error: null });
    try {
      const res = await fetch(`/api/schedule/blockers/${encodeURIComponent(blockerId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("No se pudo eliminar el bloqueo");
      const nextBlockers = (get().blockers ?? []).filter((b) => b.id !== blockerId);
      set({
        blockers: nextBlockers,
        schedule: current
          ? { ...current, blockers: nextBlockers }
          : null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar bloqueo";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ saving: false });
    }
  },

  createMilestone: async (data) => {
    const current = get().schedule;
    set({ saving: true, error: null });
    try {
      const res = await fetch("/api/schedule/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("No se pudo crear el hito");
      const json = await res.json();
      const created: ScheduleMilestone = json as ScheduleMilestone;
      const nextMilestones = [...(get().milestones ?? []), created];
      set({
        milestones: nextMilestones,
        schedule: current
          ? { ...current, milestones: nextMilestones }
          : null,
      });
      toast.success("Hito creado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear hito";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ saving: false });
    }
  },

  completeMilestone: async (milestoneId) => {
    const current = get().schedule;
    set({ saving: true, error: null });
    try {
      const res = await fetch(`/api/schedule/milestones/${encodeURIComponent(milestoneId)}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("No se pudo completar el hito");
      const json = await res.json();
      const updated: ScheduleMilestone = json as ScheduleMilestone;
      const nextMilestones = (get().milestones ?? []).map((m) =>
        m.id === updated.id ? updated : m
      );
      set({
        milestones: nextMilestones,
        schedule: current
          ? { ...current, milestones: nextMilestones }
          : null,
      });
      toast.success("Hito completado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al completar hito";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ saving: false });
    }
  },

  deleteMilestone: async (milestoneId) => {
    const current = get().schedule;
    set({ saving: true, error: null });
    try {
      const res = await fetch(`/api/schedule/milestones/${encodeURIComponent(milestoneId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("No se pudo eliminar el hito");
      const nextMilestones = (get().milestones ?? []).filter((m) => m.id !== milestoneId);
      set({
        milestones: nextMilestones,
        schedule: current
          ? { ...current, milestones: nextMilestones }
          : null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar hito";
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ saving: false });
    }
  },
}));
