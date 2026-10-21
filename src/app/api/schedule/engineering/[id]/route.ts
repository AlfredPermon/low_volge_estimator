import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteStoredFile } from "@/lib/upload-storage-db";

export const runtime = "nodejs";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const doc = await db.engineeringDocument.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Elimina el binario sin importar dónde esté almacenado:
    //   - filepath "db:<key>" -> fila en la tabla UploadedFile de Turso.
    //   - ruta relativa       -> archivo legado en disco (compatibilidad).
    try {
      await deleteStoredFile(doc.filepath);
    } catch (fsErr) {
      console.warn("File deletion warning:", fsErr);
    }

    await db.engineeringDocument.delete({ where: { id } });

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error) {
    console.error("Error deleting engineering document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
