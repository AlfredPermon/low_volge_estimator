import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabaseSchema } from "@/lib/db";
import { getSessionUser, hasPermission } from "@/lib/auth";
import { z } from "zod";
import { runCalculation } from "@/lib/calculator";

const lineItemSchema = z.object({
  id: z.string().min(1),
  partida: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  system: z.string().optional(),
  category: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
});

const updateEstimateSchema = z.object({
  name: z.string().optional(),
  clientName: z.string().optional(),
  projectName: z.string().optional(),
  currency: z.enum(["MXN", "USD"]).optional(),
  revision: z.string().optional(),
  responsible: z.string().optional(),
  projectManager: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  techResponsable: z.string().optional(),
  envResponsable: z.string().optional(),
  riskResponsable: z.string().optional(),
  notes: z.string().optional(),
  factorsNotes: z.string().max(2000).optional(),
  wasteFactorCable: z.number().min(0).max(1).optional(),
  wasteFactorConduit: z.number().min(0).max(1).optional(),
  verticalDrop: z.number().min(0).optional(),
  rackAllowance: z.number().min(0).optional(),
  indirectFactor: z.number().min(0).max(1).optional(),
  ivaRate: z.number().min(0).max(1).optional(),
  roundingPolicy: z.number().int().min(0).max(6).optional(),
  laborTechnicianRate: z.number().min(0).optional(),
  laborOfficerRate: z.number().min(0).optional(),
  laborHelperRate: z.number().min(0).optional(),
  useCrewBasedLabor: z.boolean().optional(),
  cctvConfig: z.string().optional(),
  accessConfig: z.string().optional(),
  pagingConfig: z.string().optional(),
  fireConfig: z.string().optional(),
  floorplanConfig: z.string().optional(),
  lineItems: z.array(lineItemSchema).optional(),
  forceRecalc: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

function configsChanged(
  oldData: Record<string, string>,
  newData: Record<string, unknown>
): boolean {
  return (
    (newData.cctvConfig !== undefined && newData.cctvConfig !== oldData.cctvConfig) ||
    (newData.accessConfig !== undefined && newData.accessConfig !== oldData.accessConfig) ||
    (newData.pagingConfig !== undefined && newData.pagingConfig !== oldData.pagingConfig) ||
    (newData.fireConfig !== undefined && newData.fireConfig !== oldData.fireConfig) ||
    (newData.floorplanConfig !== undefined && newData.floorplanConfig !== oldData.floorplanConfig) ||
    newData.wasteFactorCable !== undefined ||
    newData.wasteFactorConduit !== undefined ||
    newData.indirectFactor !== undefined ||
    newData.ivaRate !== undefined ||
    newData.roundingPolicy !== undefined ||
    newData.verticalDrop !== undefined ||
    newData.rackAllowance !== undefined ||
    newData.laborTechnicianRate !== undefined ||
    newData.laborOfficerRate !== undefined ||
    newData.laborHelperRate !== undefined ||
    newData.useCrewBasedLabor !== undefined
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
    ivaRate: estimate.ivaRate,
    roundingPolicy: (estimate.roundingPolicy ?? 2) as 0 | 1 | 2 | 3 | 4,
    laborRates: {
      technician: estimate.laborTechnicianRate,
      officer: estimate.laborOfficerRate,
      helper: estimate.laborHelperRate,
    },
    useCrewBasedLabor: estimate.useCrewBasedLabor,
  };

  const cctvConfig = estimate.cctvConfig ? JSON.parse(estimate.cctvConfig) : undefined;
  const accessConfig = estimate.accessConfig ? JSON.parse(estimate.accessConfig) : undefined;
  const pagingConfig = estimate.pagingConfig ? JSON.parse(estimate.pagingConfig) : undefined;
  const fireConfig = estimate.fireConfig ? JSON.parse(estimate.fireConfig) : undefined;
  const floorplanConfig = estimate.floorplanConfig ? JSON.parse(estimate.floorplanConfig) : undefined;

  const result = runCalculation({
    cctvConfig,
    accessConfig,
    pagingConfig,
    fireConfig,
    floorplanConfig,
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
      provider: pi.provider,
      certifications: pi.certifications,
      datasheetUrl: pi.datasheetUrl,
      notes: pi.notes,
      crewTechnician: pi.crewTechnician,
      crewOfficer: pi.crewOfficer,
      crewHelper: pi.crewHelper,
      laborHours: pi.laborHours,
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
      grandTotal: result.grandTotal,
      iva: result.iva,
      totalWithIva: result.totalWithIva,
    },
  });

  return result;
}

// ─── GET: Get a single estimate ─────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDatabaseSchema();
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const estimate = await db.estimate.findUnique({ where: { id } });

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    // Validar aislamiento de datos
    const isGlobal = hasPermission(user.role, 'SUPERVISOR');
    const ownerId = (estimate as Record<string, unknown>).userId as string | undefined;
    if (!isGlobal && ownerId && ownerId !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para ver este presupuesto" }, { status: 403 });
    }

    const response = {
      ...estimate,
      cctvConfig: JSON.parse(estimate.cctvConfig || "{}"),
      accessConfig: JSON.parse(estimate.accessConfig || "{}"),
      pagingConfig: JSON.parse(estimate.pagingConfig || "{}"),
      fireConfig: JSON.parse(estimate.fireConfig || "{}"),
      floorplanConfig: JSON.parse(estimate.floorplanConfig || "{}"),
      lineItems: JSON.parse(estimate.lineItems || "[]"),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error getting estimate:", error);
    return NextResponse.json({ error: "Failed to get estimate" }, { status: 500 });
  }
}

// ─── PUT: Update an estimate ────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureDatabaseSchema();
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!hasPermission(user.role, 'OPERATIVO')) {
      return NextResponse.json({ error: "No tienes permisos de edición" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await db.estimate.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const isGlobal = hasPermission(user.role, 'SUPERVISOR');
    const existingOwnerId = (existing as Record<string, unknown>).userId as string | undefined;
    if (!isGlobal && existingOwnerId && existingOwnerId !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para modificar este presupuesto" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateEstimateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.name !== undefined) updateData.name = data.name;
    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.projectName !== undefined) updateData.projectName = data.projectName;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.revision !== undefined) updateData.revision = data.revision;
    if (data.responsible !== undefined) updateData.responsible = data.responsible;
    if (data.projectManager !== undefined) updateData.projectManager = data.projectManager;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.techResponsable !== undefined) updateData.techResponsable = data.techResponsable;
    if (data.envResponsable !== undefined) updateData.envResponsable = data.envResponsable;
    if (data.riskResponsable !== undefined) updateData.riskResponsable = data.riskResponsable;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.factorsNotes !== undefined) updateData.factorsNotes = data.factorsNotes;
    if (data.wasteFactorCable !== undefined) updateData.wasteFactorCable = data.wasteFactorCable;
    if (data.wasteFactorConduit !== undefined) updateData.wasteFactorConduit = data.wasteFactorConduit;
    if (data.verticalDrop !== undefined) updateData.verticalDrop = data.verticalDrop;
    if (data.rackAllowance !== undefined) updateData.rackAllowance = data.rackAllowance;
    if (data.indirectFactor !== undefined) updateData.indirectFactor = data.indirectFactor;
    if (data.ivaRate !== undefined) updateData.ivaRate = data.ivaRate;
    if (data.roundingPolicy !== undefined) updateData.roundingPolicy = data.roundingPolicy;
    if (data.laborTechnicianRate !== undefined) updateData.laborTechnicianRate = data.laborTechnicianRate;
    if (data.laborOfficerRate !== undefined) updateData.laborOfficerRate = data.laborOfficerRate;
    if (data.laborHelperRate !== undefined) updateData.laborHelperRate = data.laborHelperRate;
    if (data.useCrewBasedLabor !== undefined) updateData.useCrewBasedLabor = data.useCrewBasedLabor;
    if (data.cctvConfig !== undefined) updateData.cctvConfig = data.cctvConfig;
    if (data.accessConfig !== undefined) updateData.accessConfig = data.accessConfig;
    if (data.pagingConfig !== undefined) updateData.pagingConfig = data.pagingConfig;
    if (data.fireConfig !== undefined) updateData.fireConfig = data.fireConfig;
    if (data.floorplanConfig !== undefined) updateData.floorplanConfig = data.floorplanConfig;

    if (data.lineItems !== undefined) {
      updateData.lineItems = JSON.stringify(data.lineItems);
      updateData.hasManualEdits = true;
    }

    const hasManual = existing.hasManualEdits || data.lineItems !== undefined;

    const needFullRecalc =
      data.forceRecalc === true ||
      (!hasManual && data.forceRecalc !== false && configsChanged(
        {
          cctvConfig: existing.cctvConfig,
          accessConfig: existing.accessConfig,
          pagingConfig: existing.pagingConfig,
          fireConfig: existing.fireConfig,
          floorplanConfig: existing.floorplanConfig,
        },
        data
      ));

    if (needFullRecalc) {
      if (data.forceRecalc === true) {
        updateData.hasManualEdits = false;
      }
      await db.estimate.update({ where: { id }, data: updateData });
      const result = await recalcEstimate(id);

      await db.estimateHistory.create({
        data: {
          estimateId: id,
          changeType: "RECALCULO_COMPLETO",
          user: user.name || data.responsible || existing.responsible || "Sistema",
          details: "Se recalculó el presupuesto desde la configuración general del proyecto",
        },
      });

      const updated = await db.estimate.findUniqueOrThrow({ where: { id } });
      const response = {
        ...updated,
        cctvConfig: JSON.parse(updated.cctvConfig || "{}"),
        accessConfig: JSON.parse(updated.accessConfig || "{}"),
        pagingConfig: JSON.parse(updated.pagingConfig || "{}"),
        fireConfig: JSON.parse(updated.fireConfig || "{}"),
        floorplanConfig: JSON.parse(updated.floorplanConfig || "{}"),
        lineItems: JSON.parse(updated.lineItems || "[]"),
        _recalcResult: result,
      };

      return NextResponse.json(response);
    }

    const updated = await db.estimate.update({ where: { id }, data: updateData });

    if (data.lineItems !== undefined) {
      const lineCount = data.lineItems.length;
      const snapshotObj = {
        lineItems: data.lineItems,
        subtotalMaterials: updated.subtotalMaterials,
        subtotalLabor: updated.subtotalLabor,
        subtotalEngineering: updated.subtotalEngineering,
        subtotalDirect: updated.subtotalDirect,
        subtotalIndirects: updated.subtotalIndirects,
        grandTotal: updated.grandTotal,
        iva: updated.iva,
        totalWithIva: updated.totalWithIva,
      };

      await db.estimateHistory.create({
        data: {
          estimateId: id,
          changeType: "EDICION_PRESUPUESTO",
          user: user.name,
          details: `Se guardaron ${lineCount} partida(s) en la versión editada del presupuesto`,
          snapshot: JSON.stringify(snapshotObj),
        },
      });
    }

    const response = {
      ...updated,
      cctvConfig: JSON.parse(updated.cctvConfig || "{}"),
      accessConfig: JSON.parse(updated.accessConfig || "{}"),
      pagingConfig: JSON.parse(updated.pagingConfig || "{}"),
      fireConfig: JSON.parse(updated.fireConfig || "{}"),
      floorplanConfig: JSON.parse(updated.floorplanConfig || "{}"),
      lineItems: JSON.parse(updated.lineItems || "[]"),
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
    await ensureDatabaseSchema();
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.estimate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const isGlobal = hasPermission(user.role, 'SUPERVISOR');
    const existingOwnerId = (existing as Record<string, unknown>).userId as string | undefined;
    if (!isGlobal && existingOwnerId && existingOwnerId !== user.id) {
      return NextResponse.json({ error: "No tienes permiso para eliminar este presupuesto" }, { status: 403 });
    }

    await db.estimate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting estimate:", error);
    return NextResponse.json({ error: "Failed to delete estimate" }, { status: 500 });
  }
}
