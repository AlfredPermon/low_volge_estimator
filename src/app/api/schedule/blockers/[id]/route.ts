import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH — Release (unblock) a blocker
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const blocker = await db.scheduleBlocker.findUnique({
      where: { id },
      include: { schedule: true },
    });
    if (!blocker) {
      return NextResponse.json({ error: "Blocker not found" }, { status: 404 });
    }
    if (!blocker.schedule.estimateId) {
      return NextResponse.json(
        { error: "El bloqueo no está asociado a un proyecto válido" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const updated = await db.scheduleBlocker.update({
      where: { id },
      data: {
        releasedAt: new Date(),
        releaseNote: body.releaseNote ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/schedule/blockers/release] Error:", error);
    return NextResponse.json({ error: "Failed to release blocker" }, { status: 500 });
  }
}

// DELETE — Hard-delete a blocker
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blocker = await db.scheduleBlocker.findUnique({
      where: { id },
      include: { schedule: true },
    });
    if (!blocker) {
      return NextResponse.json({ error: "Blocker not found" }, { status: 404 });
    }
    if (!blocker.schedule.estimateId) {
      return NextResponse.json(
        { error: "El bloqueo no está asociado a un proyecto válido" },
        { status: 403 }
      );
    }
    await db.scheduleBlocker.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/schedule/blockers/:id] Error:", error);
    return NextResponse.json({ error: "Failed to delete blocker" }, { status: 500 });
  }
}
