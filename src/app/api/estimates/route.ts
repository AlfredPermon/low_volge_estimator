import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createEstimateSchema = z.object({
  name: z.string().default("Nuevo Presupuesto"),
  clientName: z.string().default(""),
  projectName: z.string().default(""),
  currency: z.enum(["MXN", "USD"]).default("MXN"),
  wasteFactorCable: z.number().min(0).max(1).default(0.10),
  wasteFactorConduit: z.number().min(0).max(1).default(0.15),
  verticalDrop: z.number().min(0).default(3.0),
  rackAllowance: z.number().min(0).default(5.0),
  indirectFactor: z.number().min(0).max(1).default(0.12),
  utilityFactor: z.number().min(0).max(1).default(0.15),
});

// ─── GET: List all estimates ────────────────────────────────────────────────

export async function GET() {
  try {
    const estimates = await db.estimate.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ data: estimates });
  } catch (error) {
    console.error("Error listing estimates:", error);
    return NextResponse.json({ error: "Failed to list estimates" }, { status: 500 });
  }
}

// ─── POST: Create a new estimate ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createEstimateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const estimate = await db.estimate.create({
      data: {
        name: parsed.data.name,
        clientName: parsed.data.clientName,
        projectName: parsed.data.projectName,
        currency: parsed.data.currency,
        wasteFactorCable: parsed.data.wasteFactorCable,
        wasteFactorConduit: parsed.data.wasteFactorConduit,
        verticalDrop: parsed.data.verticalDrop,
        rackAllowance: parsed.data.rackAllowance,
        indirectFactor: parsed.data.indirectFactor,
        utilityFactor: parsed.data.utilityFactor,
        cctvConfig: "{}",
        accessConfig: "{}",
        pagingConfig: "{}",
        fireConfig: "{}",
        lineItems: "[]",
      },
    });

    return NextResponse.json(estimate, { status: 201 });
  } catch (error) {
    console.error("Error creating estimate:", error);
    return NextResponse.json({ error: "Failed to create estimate" }, { status: 500 });
  }
}