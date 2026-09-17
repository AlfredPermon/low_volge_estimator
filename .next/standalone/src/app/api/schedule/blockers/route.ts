import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { createBlockerSchema } from "@/lib/schedule/schedule-validators";

// POST — Create a blocker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBlockerSchema.safeParse(body);

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

    const blocker = await db.scheduleBlocker.create({
      data: {
        scheduleId: parsed.data.scheduleId,
        activityId: parsed.data.activityId,
        reason: parsed.data.reason,
        severity: parsed.data.severity,
        responsible: parsed.data.responsible,
      },
    });

    return NextResponse.json(blocker, { status: 201 });
  } catch (error) {
    console.error("[POST /api/schedule/blockers] Error:", error);
    return NextResponse.json({ error: "Failed to create blocker" }, { status: 500 });
  }
}
