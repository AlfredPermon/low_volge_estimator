import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateScheduleActivitiesFromBudget } from "@/lib/schedule/schedule-mapper";
import { createScheduleSchema, updateProcurementSchema, updateScheduleSchema } from "@/lib/schedule/schedule-validators";
import { computeScheduleAlerts } from "@/lib/schedule/schedule-alerts";

function parseLineItemsJson(raw: unknown): Array<Record<string, unknown>> {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toDateOrNull(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estimateId = searchParams.get("estimateId");
    if (!estimateId) {
      return NextResponse.json({ error: "estimateId is required" }, { status: 400 });
    }

    const schedule = await db.schedule.findUnique({
      where: { estimateId },
      include: {
        activities: { orderBy: [{ phase: "asc" }, { createdAt: "asc" }] },
        milestones: { orderBy: [{ phase: "asc" }, { createdAt: "asc" }] },
        blockers: { orderBy: [{ createdAt: "desc" }] },
        documents: { orderBy: [{ uploadedAt: "desc" }] },
        procurement: true,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const alerts = computeScheduleAlerts({
      engineeringStatus: (schedule.engineeringStatus as any) ?? "",
      engineeringJustification: schedule.engineeringJustification ?? "",
      procurement: schedule.procurement
        ? {
            comparativeRequestedAt: schedule.procurement.comparativeRequestedAt,
            comparativeMinExpectedAt: schedule.procurement.comparativeMinExpectedAt,
            supplierName: schedule.procurement.supplierName,
            requisitionNumber: schedule.procurement.requisitionNumber,
            purchaseOrderNumber: schedule.procurement.purchaseOrderNumber,
            advanceReleasedAt: schedule.procurement.advanceReleasedAt,
          }
        : null,
      activities: schedule.activities.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        endDate: a.endDate,
      })),
    });

    return NextResponse.json({ data: schedule, alerts });
  } catch (error) {
    console.error("Error loading schedule:", error);
    return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const estimate = await db.estimate.findUnique({
      where: { id: parsed.data.estimateId },
    });

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const existing = await db.schedule.findUnique({
      where: { estimateId: parsed.data.estimateId },
      include: {
        activities: { orderBy: [{ phase: "asc" }, { createdAt: "asc" }] },
        milestones: { orderBy: [{ phase: "asc" }, { createdAt: "asc" }] },
        blockers: { orderBy: [{ createdAt: "desc" }] },
        documents: { orderBy: [{ uploadedAt: "desc" }] },
        procurement: true,
      },
    });

    if (existing) {
      return NextResponse.json({ data: existing }, { status: 200 });
    }

    const lineItems = parseLineItemsJson(estimate.lineItems);
    const draftActivities = generateScheduleActivitiesFromBudget(
      lineItems.map((it) => ({
        system: String(it.system ?? ""),
        category: String(it.category ?? ""),
        description: String(it.description ?? ""),
        quantity: typeof it.quantity === "number" ? it.quantity : Number(it.quantity ?? 0),
        unit: String(it.unit ?? ""),
        unitCost: typeof it.unitCost === "number" ? it.unitCost : Number(it.unitCost ?? 0),
      }))
    );

    const created = await db.$transaction(async (tx) => {
      const schedule = await tx.schedule.create({
        data: {
          estimateId: parsed.data.estimateId,
          procurement: { create: {} },
          activities: {
            create: draftActivities.map((a) => ({
              name: a.name,
              system: a.system,
              phase: a.phase,
              assigneeRole: a.assigneeRole ?? "",
              status: a.status ?? "Pendiente",
              progress: typeof a.progress === "number" ? a.progress : 0,
              dependsOn: a.dependsOn ?? "[]",
              risk: a.risk ?? "",
              notes: a.notes ?? "",
            })),
          },
        },
        include: {
          activities: { orderBy: [{ phase: "asc" }, { createdAt: "asc" }] },
          milestones: { orderBy: [{ phase: "asc" }, { createdAt: "asc" }] },
          blockers: { orderBy: [{ createdAt: "desc" }] },
          documents: { orderBy: [{ uploadedAt: "desc" }] },
          procurement: true,
        },
      });
      return schedule;
    });

    const alerts = computeScheduleAlerts({
      engineeringStatus: (created.engineeringStatus as any) ?? "",
      engineeringJustification: created.engineeringJustification ?? "",
      procurement: created.procurement
        ? {
            comparativeRequestedAt: created.procurement.comparativeRequestedAt,
            comparativeMinExpectedAt: created.procurement.comparativeMinExpectedAt,
            supplierName: created.procurement.supplierName,
            requisitionNumber: created.procurement.requisitionNumber,
            purchaseOrderNumber: created.procurement.purchaseOrderNumber,
            advanceReleasedAt: created.procurement.advanceReleasedAt,
          }
        : null,
      activities: created.activities.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        endDate: a.endDate,
      })),
    });

    return NextResponse.json({ data: created, alerts }, { status: 201 });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const scheduleId = z.string().min(1).safeParse(body?.scheduleId);
    if (!scheduleId.success) {
      return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
    }

    const schedulePatchResult = updateScheduleSchema.safeParse(body?.schedule ?? {});
    if (!schedulePatchResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: schedulePatchResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const procurementPatchResult = body?.procurement
      ? updateProcurementSchema.safeParse({ scheduleId: scheduleId.data, ...body.procurement })
      : null;

    if (procurementPatchResult && !procurementPatchResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: procurementPatchResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const schedulePatch = schedulePatchResult.data;
    const schedule = await db.$transaction(async (tx) => {
      const updatedSchedule = await tx.schedule.update({
        where: { id: scheduleId.data },
        data: {
          startDate: schedulePatch.startDate === undefined ? undefined : toDateOrNull(schedulePatch.startDate),
          endDate: schedulePatch.endDate === undefined ? undefined : toDateOrNull(schedulePatch.endDate),
          engineeringStatus: schedulePatch.engineeringStatus ?? undefined,
          engineeringResponsible: schedulePatch.engineeringResponsible ?? undefined,
          engineeringDueDate:
            schedulePatch.engineeringDueDate === undefined ? undefined : toDateOrNull(schedulePatch.engineeringDueDate),
          engineeringJustification: schedulePatch.engineeringJustification ?? undefined,
          notes: schedulePatch.notes ?? undefined,
        },
      });

      if (procurementPatchResult) {
        const p = procurementPatchResult.data;
        await tx.procurementRecord.upsert({
          where: { scheduleId: scheduleId.data },
          create: {
            scheduleId: scheduleId.data,
            comparativeRequestedAt: toDateOrNull(p.comparativeRequestedAt),
            comparativeMinExpectedAt: toDateOrNull(p.comparativeMinExpectedAt),
            comparativeReceivedAt: toDateOrNull(p.comparativeReceivedAt),
            supplierName: p.supplierName ?? "",
            quotedAmount: typeof p.quotedAmount === "number" ? p.quotedAmount : 0,
            deliveryLeadTimeDays: typeof p.deliveryLeadTimeDays === "number" ? p.deliveryLeadTimeDays : 0,
            paymentTerms: p.paymentTerms ?? "",
            advancePercent: typeof p.advancePercent === "number" ? p.advancePercent : 0,
            requisitionNumber: p.requisitionNumber ?? "",
            purchaseOrderNumber: p.purchaseOrderNumber ?? "",
            advanceReleasedAt: toDateOrNull(p.advanceReleasedAt),
            supplierPurchaseStartedAt: toDateOrNull(p.supplierPurchaseStartedAt),
            materialsReceivedAt: toDateOrNull(p.materialsReceivedAt),
            releasedForInstallationAt: toDateOrNull(p.releasedForInstallationAt),
            status: p.status ?? "Pendiente",
            notes: p.notes ?? "",
          },
          update: {
            comparativeRequestedAt:
              p.comparativeRequestedAt === undefined ? undefined : toDateOrNull(p.comparativeRequestedAt),
            comparativeMinExpectedAt:
              p.comparativeMinExpectedAt === undefined ? undefined : toDateOrNull(p.comparativeMinExpectedAt),
            comparativeReceivedAt:
              p.comparativeReceivedAt === undefined ? undefined : toDateOrNull(p.comparativeReceivedAt),
            supplierName: p.supplierName ?? undefined,
            quotedAmount: typeof p.quotedAmount === "number" ? p.quotedAmount : undefined,
            deliveryLeadTimeDays: typeof p.deliveryLeadTimeDays === "number" ? p.deliveryLeadTimeDays : undefined,
            paymentTerms: p.paymentTerms ?? undefined,
            advancePercent: typeof p.advancePercent === "number" ? p.advancePercent : undefined,
            requisitionNumber: p.requisitionNumber ?? undefined,
            purchaseOrderNumber: p.purchaseOrderNumber ?? undefined,
            advanceReleasedAt: p.advanceReleasedAt === undefined ? undefined : toDateOrNull(p.advanceReleasedAt),
            supplierPurchaseStartedAt:
              p.supplierPurchaseStartedAt === undefined ? undefined : toDateOrNull(p.supplierPurchaseStartedAt),
            materialsReceivedAt:
              p.materialsReceivedAt === undefined ? undefined : toDateOrNull(p.materialsReceivedAt),
            releasedForInstallationAt:
              p.releasedForInstallationAt === undefined ? undefined : toDateOrNull(p.releasedForInstallationAt),
            status: p.status ?? undefined,
            notes: p.notes ?? undefined,
          },
        });
      }

      const full = await tx.schedule.findUnique({
        where: { id: updatedSchedule.id },
        include: {
          activities: { orderBy: [{ phase: "asc" }, { createdAt: "asc" }] },
          milestones: { orderBy: [{ phase: "asc" }, { createdAt: "asc" }] },
          blockers: { orderBy: [{ createdAt: "desc" }] },
          documents: { orderBy: [{ uploadedAt: "desc" }] },
          procurement: true,
        },
      });

      return full;
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const alerts = computeScheduleAlerts({
      engineeringStatus: (schedule.engineeringStatus as any) ?? "",
      engineeringJustification: schedule.engineeringJustification ?? "",
      procurement: schedule.procurement
        ? {
            comparativeRequestedAt: schedule.procurement.comparativeRequestedAt,
            comparativeMinExpectedAt: schedule.procurement.comparativeMinExpectedAt,
            supplierName: schedule.procurement.supplierName,
            requisitionNumber: schedule.procurement.requisitionNumber,
            purchaseOrderNumber: schedule.procurement.purchaseOrderNumber,
            advanceReleasedAt: schedule.procurement.advanceReleasedAt,
          }
        : null,
      activities: schedule.activities.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        endDate: a.endDate,
      })),
    });

    return NextResponse.json({ data: schedule, alerts });
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}
