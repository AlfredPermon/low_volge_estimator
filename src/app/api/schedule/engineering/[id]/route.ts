import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function getUploadRootDir(): string {
  const envDir = process.env.LVE_UPLOAD_DIR;
  if (typeof envDir === "string" && envDir.trim()) return envDir.trim();
  return path.join(process.cwd(), "uploads");
}

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

    try {
      const absPath = path.join(getUploadRootDir(), doc.filepath);
      await unlink(absPath);
    } catch (fsErr) {
      console.warn("File unlink warning:", fsErr);
    }

    await db.engineeringDocument.delete({ where: { id } });

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error) {
    console.error("Error deleting engineering document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
