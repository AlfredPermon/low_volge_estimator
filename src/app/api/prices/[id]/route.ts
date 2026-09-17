import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { recordPriceChange } from "@/lib/price-history";

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
  deviceType: z.string().optional(),
  // C1
  provider: z.string().optional(),
  certifications: z.string().optional(),
  datasheetUrl: z.string().optional(),
  notes: z.string().optional(),
  // A2
  crewTechnician: z.number().optional(),
  crewOfficer: z.number().optional(),
  crewHelper: z.number().optional(),
  laborHours: z.number().optional(),
  // C3
  changeReason: z.string().optional(),
  changedBy: z.string().optional(),
  active: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET: Retrieve a single price item by id ───────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const item = await db.priceItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Price item not found" }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching price item:", error);
    return NextResponse.json({ error: "Failed to fetch price item" }, { status: 500 });
  }
}

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

    // C3 - Recuperar el costo actual antes de actualizar para detectar cambios
    const current = await db.priceItem.findUnique({
      where: { id },
      select: { unitCost: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Price item not found" }, { status: 404 });
    }

    // Extraer metadatos de auditoría antes de pasar data al update
    const { changeReason, changedBy, ...updateData } = parsed.data;

    const item = await db.priceItem.update({
      where: { id },
      data: updateData,
    });

    // C3 - Si el costo cambió, registrar en el historial
    if (typeof updateData.unitCost === "number" && updateData.unitCost !== current.unitCost) {
      await recordPriceChange({
        priceItemId: id,
        previousCost: current.unitCost,
        newCost: updateData.unitCost,
        changedBy: changedBy || "",
        reason: changeReason || "",
      });
    }

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