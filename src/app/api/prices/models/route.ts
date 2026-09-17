import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET: List price items filtered by deviceType(s) ─────────────────────────
// Used by CCTV form to dynamically load camera models and NVR servers

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceTypes = searchParams.get("deviceTypes"); // comma-separated: "cctv_camera_bullet,cctv_camera_domo"

    if (!deviceTypes) {
      return NextResponse.json(
        { error: "deviceTypes parameter is required" },
        { status: 400 }
      );
    }

    const typesArray = deviceTypes.split(",").map((t) => t.trim()).filter(Boolean);

    const items = await db.priceItem.findMany({
      where: {
        active: true,
        deviceType: { in: typesArray },
      },
      orderBy: [
        { system: "asc" },
        { model: "asc" },
      ],
      select: {
        id: true,
        sku: true,
        system: true,
        category: true,
        brand: true,
        model: true,
        description: true,
        unit: true,
        unitCost: true,
        deviceType: true,
      },
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("Error fetching models by deviceType:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
