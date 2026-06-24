import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runCalculation } from "@/lib/calculator";

type RouteParams = { params: Promise<{ id: string }> };

// ─── POST: Run the calculation engine for an estimate ───────────────────────

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const estimate = await db.estimate.findUnique({ where: { id } });
    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    // Get all active price items
    const priceItems = await db.priceItem.findMany({ where: { active: true } });

    // Build factors
    const factors = {
      wasteFactorCable: estimate.wasteFactorCable,
      wasteFactorConduit: estimate.wasteFactorConduit,
      verticalDrop: estimate.verticalDrop,
      rackAllowance: estimate.rackAllowance,
      indirectFactor: estimate.indirectFactor,
      utilityFactor: estimate.utilityFactor,
    };

    // Parse system configs
    const cctvConfig = estimate.cctvConfig ? JSON.parse(estimate.cctvConfig) : undefined;
    const accessConfig = estimate.accessConfig ? JSON.parse(estimate.accessConfig) : undefined;
    const pagingConfig = estimate.pagingConfig ? JSON.parse(estimate.pagingConfig) : undefined;
    const fireConfig = estimate.fireConfig ? JSON.parse(estimate.fireConfig) : undefined;

    // Run calculation
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

    // Save results to the estimate
    await db.estimate.update({
      where: { id },
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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating estimate:", error);
    return NextResponse.json({ error: "Failed to calculate estimate" }, { status: 500 });
  }
}