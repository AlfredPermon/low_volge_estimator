import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { createMilestoneSchema } from "@/lib/schedule/schedule-validators";

// POST — Create a milestone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createMilestoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Validar que el schedule tiene un estimateId válido
    const schedule = await db.schedule.findUnique({
      where: { id: parsed.data.scheduleId },
    });
    if (!schedule || !schedule.estimateId) {
      return NextResponse.json(
        { error: "El cronograma no está asociado a un proyecto válido" },
        { status: 403 }
      );
    }

    const milestone = await db.scheduleMilestone.create({
      data: {
        scheduleId: parsed.data.scheduleId,
        name: parsed.data.name,
        phase: parsed.data.phase,
        targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
        responsible: parsed.data.responsible ?? "",
        notes: parsed.data.notes ?? "",
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error("[POST /api/schedule/milestones] Error:", error);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }
}
