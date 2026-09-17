import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createHistorySchema = z.object({
  changeType: z.string().min(1, "changeType is required"),
  user: z.string().default("Sistema / Usuario"),
  details: z.string().min(1, "details is required"),
});

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET: List history for an estimate ──────────────────────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const estimate = await db.estimate.findUnique({ where: { id } });
    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const history = await db.estimateHistory.findMany({
      where: { estimateId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: history });
  } catch (error) {
    console.error("Error fetching estimate history:", error);
    return NextResponse.json({ error: "Failed to fetch estimate history" }, { status: 500 });
  }
}

// ─── POST: Add a new history entry ──────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = createHistorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const estimate = await db.estimate.findUnique({ where: { id } });
    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const entry = await db.estimateHistory.create({
      data: {
        estimateId: id,
        changeType: parsed.data.changeType,
        user: parsed.data.user || estimate.responsible || "Sistema / Usuario",
        details: parsed.data.details,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating estimate history entry:", error);
    return NextResponse.json({ error: "Failed to create history entry" }, { status: 500 });
  }
}
