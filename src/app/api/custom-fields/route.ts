import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const customFields = await db.customField.findMany();
    return NextResponse.json(customFields);
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { type, value } = await request.json();
    if (!type || !value) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Usar upsert para evitar errores de duplicidad
    const field = await db.customField.upsert({
      where: {
        type_value: {
          type,
          value,
        },
      },
      update: {},
      create: {
        type,
        value,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    console.error("Error creating custom field:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { type, oldValue, newValue } = await request.json();
    if (!type || !oldValue || !newValue) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Actualizar CustomField (si existe) o crearlo si alguien más lo eliminó
    await db.customField.upsert({
      where: {
        type_value: {
          type,
          value: oldValue,
        },
      },
      update: {
        value: newValue,
      },
      create: {
        type,
        value: newValue,
      },
    });

    // Actualizar todos los precios que usaban el valor antiguo
    if (type === "system") {
      await db.priceItem.updateMany({
        where: { system: oldValue },
        data: { system: newValue },
      });
    } else if (type === "category") {
      await db.priceItem.updateMany({
        where: { category: oldValue },
        data: { category: newValue },
      });
    } else if (type === "deviceType") {
      await db.priceItem.updateMany({
        where: { deviceType: oldValue },
        data: { deviceType: newValue },
      });
    }

    return NextResponse.json({ success: true, newValue });
  } catch (error) {
    console.error("Error updating custom field:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
