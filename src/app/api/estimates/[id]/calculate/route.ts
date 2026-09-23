import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabaseSchema } from "@/lib/db";
import { runCalculation } from "@/lib/calculator";

type RouteParams = { params: Promise<{ id: string }> };

// ─── POST: Run the calculation engine for an estimate ───────────────────────

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    // BUDGET-PERSISTENCE: si el query es `?force=0` y ya existen lineItems
    // persistidos (con o sin ediciones manuales), se devuelven sin recalcular
    // para evitar sobreescribir las ediciones del usuario.
    const forceRecalc = request.nextUrl.searchParams.get("force") !== "0";

    const estimate = await db.estimate.findUnique({ where: { id } });
    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    // Si NO se fuerza recálculo y hay lineItems persistidos, devolverlos
    // tal cual con los totales ya calculados. Esto permite al cliente
    // recargar el presupuesto sin perder ediciones manuales.
    if (!forceRecalc && estimate.lineItems && estimate.lineItems !== "[]") {
      const persistedLineItems = JSON.parse(estimate.lineItems);
      return NextResponse.json({
        lineItems: persistedLineItems,
        subtotalMaterials: estimate.subtotalMaterials,
        subtotalLabor: estimate.subtotalLabor,
        subtotalEngineering: estimate.subtotalEngineering,
        subtotalDirect: estimate.subtotalDirect,
        subtotalIndirects: estimate.subtotalIndirects,
        grandTotal: estimate.grandTotal,
        iva: estimate.iva,
        totalWithIva: estimate.totalWithIva,
      });
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
      ivaRate: estimate.ivaRate,
      roundingPolicy: (estimate.roundingPolicy ?? 2) as 0 | 1 | 2 | 3 | 4,
      // A2 - Mano de obra por cuadrilla
      laborRates: {
        technician: estimate.laborTechnicianRate,
        officer: estimate.laborOfficerRate,
        helper: estimate.laborHelperRate,
      },
      useCrewBasedLabor: estimate.useCrewBasedLabor,
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
        deviceType: pi.deviceType,
        active: pi.active,
        // C1
        provider: pi.provider,
        certifications: pi.certifications,
        datasheetUrl: pi.datasheetUrl,
        notes: pi.notes,
        // A2
        crewTechnician: pi.crewTechnician,
        crewOfficer: pi.crewOfficer,
        crewHelper: pi.crewHelper,
        laborHours: pi.laborHours,
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
        grandTotal: result.grandTotal,
        iva: result.iva,
        totalWithIva: result.totalWithIva,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating estimate:", error);
    return NextResponse.json({ error: "Failed to calculate estimate" }, { status: 500 });
  }
}