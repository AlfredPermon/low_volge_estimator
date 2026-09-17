import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH — Complete (mark as done) a milestone
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const milestone = await db.scheduleMilestone.findUnique({
      where: { id },
      include: { schedule: true },
    });
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }
    if (!milestone.schedule.estimateId) {
      return NextResponse.json(
        { error: "El hito no está asociado a un proyecto válido" },
        { status: 403 }
      );
    }

    const updated = await db.scheduleMilestone.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/schedule/milestones/:id] Error:", error);
    return NextResponse.json({ error: "Failed to complete milestone" }, { status: 500 });
  }
}

// DELETE — Hard-delete a milestone
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const milestone = await db.scheduleMilestone.findUnique({
      where: { id },
      include: { schedule: true },
    });
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }
    if (!milestone.schedule.estimateId) {
      return NextResponse.json(
        { error: "El hito no está asociado a un proyecto válido" },
        { status: 403 }
      );
    }
    await db.scheduleMilestone.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/schedule/milestones/:id] Error:", error);
    return NextResponse.json({ error: "Failed to delete milestone" }, { status: 500 });
  }
}
