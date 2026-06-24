import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const updatePriceItemSchema = z.object({
  sku: z.string().optional(),
  system: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  unitCost: z.number().optional(),
  performance: z.number().optional(),
  active: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// ─── PUT: Update a price item ──────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updatePriceItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const item = await db.priceItem.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating price item:", error);
    return NextResponse.json({ error: "Failed to update price item" }, { status: 500 });
  }
}

// ─── DELETE: Delete a price item ────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await db.priceItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting price item:", error);
    return NextResponse.json({ error: "Failed to delete price item" }, { status: 500 });
  }
}