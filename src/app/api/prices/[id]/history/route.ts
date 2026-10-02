import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/price-history";
import { requirePermission } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * C3 - GET /api/prices/[id]/history
 * Devuelve el historial de cambios de costo de un PriceItem.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const guard = await requirePermission(request, 'PRECIOS', 'READ');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const history = await getPriceHistory(id);
    return NextResponse.json({ data: history, total: history.length });
  } catch (error) {
    console.error("Error fetching price history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
