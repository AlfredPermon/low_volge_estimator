import { NextRequest, NextResponse } from "next/server";
import { db, ensureDatabaseSchema } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { z } from "zod";

const createPriceItemSchema = z.object({
  sku: z.string().default(""),
  system: z.string().min(1, "System is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().default(""),
  model: z.string().default(""),
  description: z.string().min(1, "Description is required"),
  unit: z.string().default("pza"),
  unitCost: z.number().min(0).default(0),
  performance: z.number().min(0).default(0),
  deviceType: z.string().default(""),
  provider: z.string().default(""),
  certifications: z.string().default(""),
  datasheetUrl: z.string().default(""),
  notes: z.string().default(""),
  crewTechnician: z.number().min(0).default(0),
  crewOfficer: z.number().min(0).default(0),
  crewHelper: z.number().min(0).default(0),
  laborHours: z.number().min(0).default(0),
  active: z.boolean().default(true),
});

// ─── GET: List all price items with optional filters ────────────────────────
// Requiere: PRECIOS → READ (todos los perfiles autenticados tienen al menos READ)

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const guard = await requirePermission(request, 'PRECIOS', 'READ');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const system = searchParams.get("system");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    const where: Record<string, unknown> = { active: true };

    if (system) where.system = system;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { sku: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      db.priceItem.findMany({
        where,
        orderBy: { system: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.priceItem.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing price items:", error);
    return NextResponse.json({ error: "Failed to list price items" }, { status: 500 });
  }
}

// ─── POST: Create a single price item ──────────────────────────────────────
// Requiere: PRECIOS → WRITE
// Perfiles con WRITE: admin, Project Manager, Seguridad Electrónica, Seguridad Industrial, Medio Ambiente
// Perfiles bloqueados: Consultor (READ only)

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const guard = await requirePermission(request, 'PRECIOS', 'WRITE', { auditOnSuccess: true });
    if (guard instanceof NextResponse) return guard;
    const { user } = guard;

    const body = await request.json();
    const parsed = createPriceItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const item = await db.priceItem.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating price item:", error);
    return NextResponse.json({ error: "Failed to create price item" }, { status: 500 });
  }
}

// ─── DELETE: Bulk delete price items ──────────────────────────────────────
// Requiere: PRECIOS → ADMIN (solo administrador puede eliminar masivamente)

export async function DELETE(request: NextRequest) {
  try {
    await ensureDatabaseSchema();

    const guard = await requirePermission(request, 'PRECIOS', 'ADMIN', { auditOnSuccess: true });
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { ids } = body ?? {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un arreglo 'ids' con al menos un ID" },
        { status: 400 }
      );
    }

    const result = await db.priceItem.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Error bulk deleting price items:", error);
    return NextResponse.json({ error: "Failed to delete price items" }, { status: 500 });
  }
}