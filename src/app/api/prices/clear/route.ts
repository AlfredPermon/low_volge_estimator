import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';

// ─── POST: Clear all price items (solo ADMIN) ───────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission(request, 'PRECIOS', 'ADMIN', { auditOnSuccess: true });
    if (guard instanceof NextResponse) return guard;

    // Eliminar todos los registros de PriceItem (y sus PriceHistory por cascade)
    const deletedCount = await db.priceItem.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${deletedCount.count} registros de precios`,
      deletedCount: deletedCount.count,
    });
  } catch (error) {
    console.error("Error clearing price database:", error);
    return NextResponse.json(
      { error: "Fallo al limpiar la base de datos de precios", details: String(error) },
      { status: 500 }
    );
  }
}
