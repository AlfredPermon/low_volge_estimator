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

function userErrorMessage(error: unknown): string {
  // Si el servidor ya devolvió un mensaje claro (p. ej. validación o límite de tamaño),
  // reenvíalo al usuario en lugar del genérico "No se pudo subir el PDF".
  if (error instanceof Error && error.message && !/^Failed to upload document$/i.test(error.message)) {
    return error.message;
  }
  return "No se pudo subir el PDF. Inténtalo de nuevo.";
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission(request, "CRONOGRAMA", "WRITE", { auditOnSuccess: true });
    if (guard instanceof NextResponse) return guard;

    // Leer FormData protegido: si el body excede el límite, request.formData() lanza
    // y el error original puede no tener mensaje útil. Validamos también después de leer.
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err) {
      console.error("Error parsing multipart form data (upload plano PDF):", err);
      return NextResponse.json(
        { error: "No se pudo procesar el archivo subido. Verifica que sea un PDF de hasta 20 MB." },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Selecciona un archivo PDF antes de subir." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "El archivo está vacío. Selecciona un PDF válido." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "El archivo debe ser un PDF de hasta 20 MB." }, { status: 400 });
    }
    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Solo se permiten documentos PDF." }, { status: 400 });
    }

    const scheduleId = String(formData.get("scheduleId") ?? "");
    // El frontend envía los metadatos del plano; "Subido por" siempre es la sesión actual.
    const system = String(formData.get("system") ?? "").trim();
    const revision = String(formData.get("revision") ?? "").trim();
    const status = String(formData.get("status") ?? "Cargado").trim() || "Cargado";
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
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const detail = fieldErrors.status
        ? `Estatus del documento no válido: "${status}".`
        : fieldErrors.scheduleId
          ? "Falta el identificador del cronograma. Recarga la página e inténtalo de nuevo."
          : "Los datos del plano no son válidos.";
      return NextResponse.json(
        { error: detail, details: fieldErrors },
        { status: 400 }
      );
    }

    const schedule = await db.schedule.findUnique({ where: { id: parsed.data.scheduleId } });
    if (!schedule) {
      return NextResponse.json({ error: "No existe el cronograma asociado al proyecto." }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    if (!fileBuffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return NextResponse.json({ error: "El contenido del archivo no es un PDF válido." }, { status: 400 });
    }

    const uploadRoot = getUploadRootDir();
    const scheduleDir = path.join(uploadRoot, "schedule", schedule.id, "engineering");
    await mkdir(scheduleDir, { recursive: true });

    const fileId = crypto.randomUUID();
    const originalName = safeBasename(file.name || "plano.pdf");
    const ext = originalName.toLowerCase().endsWith(".pdf") ? ".pdf" : path.extname(originalName) || ".pdf";
    const storedFilename = `${fileId}${ext}`;
    const storedPath = path.join(scheduleDir, storedFilename);

    try {
      await writeFile(storedPath, fileBuffer);
    } catch (err) {
      console.error("Error writing plano PDF to disk:", err);
      return NextResponse.json(
        { error: "No se pudo guardar el archivo en el servidor (permisos o disco lleno)." },
        { status: 500 }
      );
    }

    const relativePath = path.join("schedule", schedule.id, "engineering", storedFilename).replace(/\\/g, "/");

    let created;
    try {
      created = await db.engineeringDocument.create({
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
    } catch (err) {
      console.error("Error creating EngineeringDocument record:", err);
      // No dejar huérfano el archivo escrito en disco.
      await import("node:fs/promises").then(({ unlink }) => unlink(storedPath).catch(() => {}));
      return NextResponse.json(
        { error: "No se pudo registrar el plano en la base de datos." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("Error uploading engineering document:", error);
    return NextResponse.json({ error: userErrorMessage(error) }, { status: 500 });
  }
}
