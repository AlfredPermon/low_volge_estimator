import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateActivitySchema } from "@/lib/schedule/schedule-validators";

function toDateOrNull(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateActivitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Validar que la actividad pertenece a un schedule con estimateId válido
    const activity = await db.scheduleActivity.findUnique({
      where: { id },
      include: { schedule: true },
    });
    if (!activity || !activity.schedule.estimateId) {
      return NextResponse.json(
        { error: "La actividad no está asociada a un proyecto válido" },
        { status: 403 }
      );
    }

    const patch = parsed.data;
    const updated = await db.scheduleActivity.update({
      where: { id },
      data: {
        name: patch.name ?? undefined,
        system: patch.system ?? undefined,
        phase: patch.phase ?? undefined,
        startDate: patch.startDate === undefined ? undefined : toDateOrNull(patch.startDate),
        endDate: patch.endDate === undefined ? undefined : toDateOrNull(patch.endDate),
        assigneeRole: patch.assigneeRole ?? undefined,
        status: patch.status ?? undefined,
        progress: typeof patch.progress === "number" ? patch.progress : undefined,
        dependsOn: patch.dependsOn ?? undefined,
        risk: patch.risk ?? undefined,
        notes: patch.notes ?? undefined,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
  }
}

