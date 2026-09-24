import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabaseSchema } from "@/lib/db";
import { getSessionUser, hasPermission } from "@/lib/auth";
import { z } from "zod";

const createEstimateSchema = z.object({
  name: z.string().default("Nuevo Presupuesto"),
  clientName: z.string().default(""),
  projectName: z.string().default(""),
  currency: z.enum(["MXN", "USD"]).default("MXN"),
  revision: z.string().default("Rev. 1"),
  responsible: z.string().default(""),
  projectManager: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  techResponsable: z.string().default(""),
  envResponsable: z.string().default(""),
  riskResponsable: z.string().default(""),
  notes: z.string().default(""),
  factorsNotes: z.string().max(2000).default(""),
  wasteFactorCable: z.number().min(0).max(1).default(0.10),
  wasteFactorConduit: z.number().min(0).max(1).default(0.15),
  verticalDrop: z.number().min(0).default(3.0),
  rackAllowance: z.number().min(0).default(5.0),
  indirectFactor: z.number().min(0).max(1).default(0.12),
  ivaRate: z.number().min(0).max(1).default(0.16),
  roundingPolicy: z.number().int().min(0).max(6).default(2),
  // A2 - Mano de obra por cuadrilla
  laborTechnicianRate: z.number().min(0).default(950.0),
  laborOfficerRate: z.number().min(0).default(750.0),
  laborHelperRate: z.number().min(0).default(500.0),
  useCrewBasedLabor: z.boolean().default(false),
});

// ─── GET: List all estimates ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseSchema();
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Administradores y supervisores ven todos los presupuestos; otros ven los suyos y los no asignados
    const isGlobalView = hasPermission(user.role, 'SUPERVISOR');
    const whereCondition = isGlobalView
      ? {}
      : { OR: [{ userId: user.id }, { userId: null }] };

    const estimates = await db.estimate.findMany({
      where: whereCondition,
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
    await ensureDatabaseSchema();
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!hasPermission(user.role, 'OPERATIVO')) {
      return NextResponse.json({ error: "No tienes permisos para crear presupuestos" }, { status: 403 });
    }

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
        revision: parsed.data.revision,
        responsible: parsed.data.responsible || user.name,
        projectManager: parsed.data.projectManager,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        techResponsable: parsed.data.techResponsable,
        envResponsable: parsed.data.envResponsable,
        riskResponsable: parsed.data.riskResponsable,
        notes: parsed.data.notes,
        factorsNotes: parsed.data.factorsNotes,
        wasteFactorCable: parsed.data.wasteFactorCable,
        wasteFactorConduit: parsed.data.wasteFactorConduit,
        verticalDrop: parsed.data.verticalDrop,
        rackAllowance: parsed.data.rackAllowance,
        indirectFactor: parsed.data.indirectFactor,
        ivaRate: parsed.data.ivaRate,
        roundingPolicy: parsed.data.roundingPolicy,
        laborTechnicianRate: parsed.data.laborTechnicianRate,
        laborOfficerRate: parsed.data.laborOfficerRate,
        laborHelperRate: parsed.data.laborHelperRate,
        useCrewBasedLabor: parsed.data.useCrewBasedLabor,
        cctvConfig: typeof body.cctvConfig === "string" ? body.cctvConfig : (body.cctvConfig ? JSON.stringify(body.cctvConfig) : "{}"),
        accessConfig: typeof body.accessConfig === "string" ? body.accessConfig : (body.accessConfig ? JSON.stringify(body.accessConfig) : "{}"),
        pagingConfig: typeof body.pagingConfig === "string" ? body.pagingConfig : (body.pagingConfig ? JSON.stringify(body.pagingConfig) : "{}"),
        fireConfig: typeof body.fireConfig === "string" ? body.fireConfig : (body.fireConfig ? JSON.stringify(body.fireConfig) : "{}"),
        floorplanConfig: typeof body.floorplanConfig === "string" ? body.floorplanConfig : (body.floorplanConfig ? JSON.stringify(body.floorplanConfig) : "{}"),
        lineItems: "[]",
        userId: user.id,
      },
    });

    return NextResponse.json(estimate, { status: 201 });
  } catch (error) {
    console.error("Error creating estimate:", error);
    return NextResponse.json({ error: "Failed to create estimate" }, { status: 500 });
  }
}
