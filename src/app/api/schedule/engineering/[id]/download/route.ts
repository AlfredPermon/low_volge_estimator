import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function getUploadRootDir(): string {
  const envDir = process.env.LVE_UPLOAD_DIR;
  if (typeof envDir === "string" && envDir.trim()) return envDir.trim();
  return path.join(process.cwd(), "uploads");
}

function safeBasename(name: string): string {
  return name.replace(/[^\w.-]+/g, "_");
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const doc = await db.engineeringDocument.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const absPath = path.join(getUploadRootDir(), doc.filepath);
    const buf = await readFile(absPath);

    const filename = safeBasename(doc.filename || "plano.pdf");

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error downloading engineering document:", error);
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
  }
}

