import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { getBinaryForStoredPath } from "@/lib/upload-storage-db";

export const runtime = "nodejs";

function safeBasename(name: string): string {
  return name.replace(/[^\w.-]+/g, "_");
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requirePermission(request, "CRONOGRAMA", "READ");
    if (guard instanceof NextResponse) return guard;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const doc = await db.engineeringDocument.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // El binario puede estar en Turso (filepath "db:<key>") o en disco (rutas
    // legadas anteriores a la migración). getBinaryForStoredPath resuelve ambos.
    const resolved = await getBinaryForStoredPath(doc.filepath);
    if (!resolved) {
      return NextResponse.json(
        { error: "El archivo de este plano ya no está disponible en el servidor. Vuelve a subirlo." },
        { status: 404 }
      );
    }
    if (resolved.missingError) {
      return NextResponse.json({ error: resolved.missingError }, { status: 404 });
    }
    const buf = resolved.buffer;

    const filename = safeBasename(doc.filename || "plano.pdf");

    const searchParams = request.nextUrl.searchParams;
    const isInline =
      searchParams.get("inline") === "1" ||
      searchParams.get("inline") === "true" ||
      searchParams.get("disposition") === "inline";

    const dispositionType = isInline ? "inline" : "attachment";

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error downloading engineering document:", error);
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
  }
}
