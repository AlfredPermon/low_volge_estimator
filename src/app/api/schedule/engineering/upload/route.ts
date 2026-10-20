import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { createEngineeringDocumentSchema } from "@/lib/schedule/schedule-validators";

export const runtime = "nodejs";
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function getUploadRootDir(): string {
  const envDir = process.env.LVE_UPLOAD_DIR;
  if (typeof envDir === "string" && envDir.trim()) return envDir.trim();
  return path.join(process.cwd(), "uploads");
}

function safeBasename(name: string): string {
  return name.replace(/[^\w.-]+/g, "_");
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission(request, "CRONOGRAMA", "WRITE", { auditOnSuccess: true });
    if (guard instanceof NextResponse) return guard;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "El archivo debe ser un PDF de hasta 20 MB." }, { status: 400 });
    }
    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Solo se permiten documentos PDF." }, { status: 400 });
    }

    const scheduleId = String(formData.get("scheduleId") ?? "");
    const system = String(formData.get("system") ?? "");
    const revision = String(formData.get("revision") ?? "");
    const status = String(formData.get("status") ?? "Cargado");
    const uploadedBy = guard.user.name || guard.user.email;
    const notes = String(formData.get("notes") ?? "");

    const parsed = createEngineeringDocumentSchema.safeParse({
      scheduleId,
      system,
      revision,
      status,
      uploadedBy,
      notes,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const schedule = await db.schedule.findUnique({ where: { id: parsed.data.scheduleId } });
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const uploadRoot = getUploadRootDir();
    const scheduleDir = path.join(uploadRoot, "schedule", schedule.id, "engineering");
    await mkdir(scheduleDir, { recursive: true });

    const fileId = crypto.randomUUID();
    const originalName = safeBasename(file.name || "plano.pdf");
    const ext = originalName.toLowerCase().endsWith(".pdf") ? ".pdf" : path.extname(originalName) || ".pdf";
    const storedFilename = `${fileId}${ext}`;
    const storedPath = path.join(scheduleDir, storedFilename);

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    if (!fileBuffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return NextResponse.json({ error: "El contenido del archivo no es un PDF válido." }, { status: 400 });
    }
    await writeFile(storedPath, fileBuffer);

    const relativePath = path.join("schedule", schedule.id, "engineering", storedFilename).replace(/\\/g, "/");

    const created = await db.engineeringDocument.create({
      data: {
        scheduleId: schedule.id,
        system: parsed.data.system,
        filename: originalName,
        filepath: relativePath,
        revision: parsed.data.revision,
        status: parsed.data.status,
        uploadedBy: parsed.data.uploadedBy,
        notes: parsed.data.notes,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("Error uploading engineering document:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
