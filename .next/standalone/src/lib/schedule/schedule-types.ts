export const SCHEDULE_PHASES = [
  { id: 1, label: "Ingeniería y Diseño" },
  { id: 2, label: "Suministro y Logística" },
  { id: 3, label: "Infraestructura" },
  { id: 4, label: "Cableado y Conectorización" },
  { id: 5, label: "Montaje y Comisionamiento" },
] as const;

export type SchedulePhaseId = (typeof SCHEDULE_PHASES)[number]["id"];

export const SCHEDULE_STATUSES = [
  "Pendiente",
  "Listo para iniciar",
  "En proceso",
  "Bloqueado",
  "En revisión",
  "Terminado",
] as const;

export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const SCHEDULE_ROLES = [
  "PM",
  "Ingeniería",
  "Cadena de Suministro",
  "Instalación",
  "Comisionamiento",
] as const;

export type ScheduleRole = (typeof SCHEDULE_ROLES)[number];

export const BLOCKER_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type BlockerSeverity = (typeof BLOCKER_SEVERITIES)[number];

export const MILESTONE_PHASES = [
  "engineering",
  "procurement",
  "infrastructure",
  "cabling",
  "commissioning",
  "delivery",
  "general",
] as const;
export type MilestonePhase = (typeof MILESTONE_PHASES)[number];

export const MILESTONE_STATUSES = ["pending", "completed"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const ENGINEERING_STATUSES = [
  "EXISTE",
  "NO_REQUERIDO",
  "EN_PROCESO",
  "NO_APLICA",
] as const;

export type EngineeringStatus = (typeof ENGINEERING_STATUSES)[number];

export const ENGINEERING_DOCUMENT_STATUSES = [
  "Cargado",
  "En revisión",
  "Aprobado",
  "Rechazado",
  "Sustituido",
] as const;

export type EngineeringDocumentStatus = (typeof ENGINEERING_DOCUMENT_STATUSES)[number];

export const SCHEDULE_SYSTEMS = [
  "CCTV",
  "Control de acceso",
  "Detección de incendio",
  "Voz y datos",
  "Voceo / audio ambiental",
  "Automatización",
  "Intercomunicación",
  "Intrusión",
] as const;

export type ScheduleSystem = (typeof SCHEDULE_SYSTEMS)[number];

export type BudgetLineItemLike = {
  system: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
};

export type ScheduleActivityDraft = {
  name: string;
  system: string;
  phase: number;
  assigneeRole?: string;
  status?: string;
  progress?: number;
  dependsOn?: string;
  risk?: string;
  notes?: string;
};

