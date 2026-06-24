import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { runCalculation } from "@/lib/calculator";

const updateEstimateSchema = z.object({
  name: z.string().optional(),
  clientName: z.string().optional(),
  projectName: z.string().optional(),
  currency: z.enum(["MXN", "USD"]).optional(),
  wasteFactorCable: z.number().min(0).max(1).optional(),
  wasteFactorConduit: z.number().min(0).max(1).optional(),
  verticalDrop: z.number().min(0).optional(),
  rackAllowance: z.number().min(0).optional(),
  indirectFactor: z.number().min(0).max(1).optional(),
  utilityFactor: z.number().min(0).max(1).optional(),
  cctvConfig: z.string().optional(),
  accessConfig: z.string().optional(),
  pagingConfig: z.string().optional(),
  fireConfig: z.string().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// ─── Helper: check if system configs changed ────────────────────────────────

function configsChanged(
  oldData: Record<string, string>,
  newData: Record<string, string | undefined>
): boolean {
  return (
    (newData.cctvConfig !== undefined && newData.cctvConfig !== oldData.cctvConfig) ||
    (newData.accessConfig !== undefined && newData.accessConfig !== oldData.accessConfig) ||
    (newData.pagingConfig !== undefined && newData.pagingConfig !== oldData.pagingConfig) ||
    (newData.fireConfig !== undefined && newData.fireConfig !== oldData.fireConfig) ||
    newData.wasteFactorCable !== undefined ||
    newData.wasteFactorConduit !== undefined ||
    newData.indirectFactor !== undefined ||
    newData.utilityFactor !== undefined ||
    newData.verticalDrop !== undefined ||
    newData.rackAllowance !== undefined
  );
}

async function recalcEstimate(estimateId: string) {
  const estimate = await db.estimate.findUniqueOrThrow({ where: { id: estimateId } });

  const priceItems = await db.priceItem.findMany({ where: { active: true } });

  const factors = {
    wasteFactorCable: estimate.wasteFactorCable,
    wasteFactorConduit: estimate.wasteFactorConduit,
    verticalDrop: estimate.verticalDrop,
    rackAllowance: estimate.rackAllowance,
    indirectFactor: estimate.indirectFactor,
    utilityFactor: estimate.utilityFactor,
  };

  const cctvConfig = estimate.cctvConfig ? JSON.parse(estimate.cctvConfig) : undefined;
  const accessConfig = estimate.accessConfig ? JSON.parse(estimate.accessConfig) : undefined;
  const pagingConfig = estimate.pagingConfig ? JSON.parse(estimate.pagingConfig) : undefined;
  const fireConfig = estimate.fireConfig ? JSON.parse(estimate.fireConfig) : undefined;

  const result = runCalculation({
    cctvConfig,
    accessConfig,
    pagingConfig,
    fireConfig,
    factors,
    priceItems: priceItems.map((pi) => ({
      id: pi.id,
      sku: pi.sku,
      system: pi.system,
      category: pi.category,
      brand: pi.brand,
      model: pi.model,
      description: pi.description,
      unit: pi.unit,
      unitCost: pi.unitCost,
      performance: pi.performance,
      active: pi.active,
    })),
  });

  await db.estimate.update({
    where: { id: estimateId },
    data: {
      lineItems: JSON.stringify(result.lineItems),
      subtotalMaterials: result.subtotalMaterials,
      subtotalLabor: result.subtotalLabor,
      subtotalEngineering: result.subtotalEngineering,
      subtotalDirect: result.subtotalDirect,
      subtotalIndirects: result.subtotalIndirects,
      subtotalUtility: result.subtotalUtility,
      grandTotal: result.grandTotal,
    },
  });

  return result;
}

// ─── GET: Get a single estimate ─────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const estimate = await db.estimate.findUnique({ where: { id } });

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    // Parse JSON fields for the response
    const response = {
      ...estimate,
      cctvConfig: JSON.parse(estimate.cctvConfig),
      accessConfig: JSON.parse(estimate.accessConfig),
      pagingConfig: JSON.parse(estimate.pagingConfig),
      fireConfig: JSON.parse(estimate.fireConfig),
      lineItems: JSON.parse(estimate.lineItems),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error getting estimate:", error);
    return NextResponse.json({ error: "Failed to get estimate" }, { status: 500 });
  }
}

// ─── PUT: Update an estimate (auto-recalculates if configs/factors change) ─

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateEstimateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check existence
    const existing = await db.estimate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.name !== undefined) updateData.name = data.name;
    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.projectName !== undefined) updateData.projectName = data.projectName;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.wasteFactorCable !== undefined) updateData.wasteFactorCable = data.wasteFactorCable;
    if (data.wasteFactorConduit !== undefined) updateData.wasteFactorConduit = data.wasteFactorConduit;
    if (data.verticalDrop !== undefined) updateData.verticalDrop = data.verticalDrop;
    if (data.rackAllowance !== undefined) updateData.rackAllowance = data.rackAllowance;
    if (data.indirectFactor !== undefined) updateData.indirectFactor = data.indirectFactor;
    if (data.utilityFactor !== undefined) updateData.utilityFactor = data.utilityFactor;
    if (data.cctvConfig !== undefined) updateData.cctvConfig = data.cctvConfig;
    if (data.accessConfig !== undefined) updateData.accessConfig = data.accessConfig;
    if (data.pagingConfig !== undefined) updateData.pagingConfig = data.pagingConfig;
    if (data.fireConfig !== undefined) updateData.fireConfig = data.fireConfig;

    // Check if recalculation is needed
    const needRecalc = configsChanged(
      {
        cctvConfig: existing.cctvConfig,
        accessConfig: existing.accessConfig,
        pagingConfig: existing.pagingConfig,
        fireConfig: existing.fireConfig,
      },
      data
    );

    if (needRecalc) {
      // Update first, then recalculate
      await db.estimate.update({ where: { id }, data: updateData });
      const result = await recalcEstimate(id);

      const updated = await db.estimate.findUniqueOrThrow({ where: { id } });
      const response = {
        ...updated,
        cctvConfig: JSON.parse(updated.cctvConfig),
        accessConfig: JSON.parse(updated.accessConfig),
        pagingConfig: JSON.parse(updated.pagingConfig),
        fireConfig: JSON.parse(updated.fireConfig),
        lineItems: JSON.parse(updated.lineItems),
        _recalcResult: result,
      };

      return NextResponse.json(response);
    }

    const updated = await db.estimate.update({ where: { id }, data: updateData });

    const response = {
      ...updated,
      cctvConfig: JSON.parse(updated.cctvConfig),
      accessConfig: JSON.parse(updated.accessConfig),
      pagingConfig: JSON.parse(updated.pagingConfig),
      fireConfig: JSON.parse(updated.fireConfig),
      lineItems: JSON.parse(updated.lineItems),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating estimate:", error);
    return NextResponse.json({ error: "Failed to update estimate" }, { status: 500 });
  }
}

// ─── DELETE: Delete an estimate ─────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await db.estimate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting estimate:", error);
    return NextResponse.json({ error: "Failed to delete estimate" }, { status: 500 });
  }
}