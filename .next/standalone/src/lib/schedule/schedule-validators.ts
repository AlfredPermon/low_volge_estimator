import { z } from "zod";
import {
  ENGINEERING_STATUSES,
  ENGINEERING_DOCUMENT_STATUSES,
  SCHEDULE_STATUSES,
  BLOCKER_SEVERITIES,
  MILESTONE_PHASES,
} from "./schedule-types";

export const scheduleIdSchema = z.string().min(1);
export const estimateIdSchema = z.string().min(1);

export const createScheduleSchema = z.object({
  estimateId: estimateIdSchema,
});

export const updateScheduleSchema = z.object({
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  engineeringStatus: z.enum(ENGINEERING_STATUSES as unknown as [string, ...string[]]).optional(),
  engineeringResponsible: z.string().optional(),
  engineeringDueDate: z.string().datetime().nullable().optional(),
  engineeringJustification: z.string().optional(),
  notes: z.string().optional(),
});

export const createActivitySchema = z.object({
  scheduleId: scheduleIdSchema,
  name: z.string().min(1),
  system: z.string().default(""),
  phase: z.number().int().min(0).max(99).default(0),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  assigneeRole: z.string().default(""),
  status: z.enum(SCHEDULE_STATUSES as unknown as [string, ...string[]]).default("Pendiente"),
  progress: z.number().min(0).max(100).default(0),
  dependsOn: z.string().default("[]"),
  risk: z.string().default(""),
  notes: z.string().default(""),
});

export const updateActivitySchema = z.object({
  name: z.string().min(1).optional(),
  system: z.string().optional(),
  phase: z.number().int().min(0).max(99).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  assigneeRole: z.string().optional(),
  status: z.enum(SCHEDULE_STATUSES as unknown as [string, ...string[]]).optional(),
  progress: z.number().min(0).max(100).optional(),
  dependsOn: z.string().optional(),
  risk: z.string().optional(),
  notes: z.string().optional(),
});

export const updateProcurementSchema = z.object({
  scheduleId: scheduleIdSchema,
  comparativeRequestedAt: z.string().datetime().nullable().optional(),
  comparativeMinExpectedAt: z.string().datetime().nullable().optional(),
  comparativeReceivedAt: z.string().datetime().nullable().optional(),
  supplierName: z.string().optional(),
  quotedAmount: z.number().min(0).optional(),
  deliveryLeadTimeDays: z.number().int().min(0).optional(),
  paymentTerms: z.string().optional(),
  advancePercent: z.number().min(0).max(100).optional(),
  requisitionNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  advanceReleasedAt: z.string().datetime().nullable().optional(),
  supplierPurchaseStartedAt: z.string().datetime().nullable().optional(),
  materialsReceivedAt: z.string().datetime().nullable().optional(),
  releasedForInstallationAt: z.string().datetime().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export const createEngineeringDocumentSchema = z.object({
  scheduleId: scheduleIdSchema,
  system: z.string().default(""),
  revision: z.string().default(""),
  status: z.enum(ENGINEERING_DOCUMENT_STATUSES as unknown as [string, ...string[]]).default("Cargado"),
  uploadedBy: z.string().default(""),
  notes: z.string().default(""),
});

export const createBlockerSchema = z.object({
  scheduleId: scheduleIdSchema,
  activityId: z.string().min(1),
  reason: z.string().min(1),
  severity: z.enum(BLOCKER_SEVERITIES as unknown as [string, ...string[]]).default("medium"),
  responsible: z.string().default(""),
});

export const createMilestoneSchema = z.object({
  scheduleId: scheduleIdSchema,
  name: z.string().min(1),
  phase: z.enum(MILESTONE_PHASES as unknown as [string, ...string[]]).default("general"),
  targetDate: z.string().min(1),
  responsible: z.string().default(""),
  notes: z.string().default(""),
});

