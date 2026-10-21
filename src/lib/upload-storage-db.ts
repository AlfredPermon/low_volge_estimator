/**
 * Almacén de archivos de planos en la base de datos (Turso / libSQL).
 *
 * Contexto del issue corregido:
 *   "ENOENT: no such file or directory, mkdir '/var/task/uploads'"
 *   El deploy se ejecuta en AWS Lambda (/var/task = sistema de archivos de SOLO
 *   LECTURA) y usa Turso como base de datos. Cualquier estrategia basada en
 *   disco local falla en serverless: el directorio no es escribible y, aunque lo
 *   fuera (/tmp), los archivos serían efímeros e inaccesibles entre instancias,
 *   rompiendo descarga/preview/aunque la fila exista en Turso.
 *
 * Solución efectiva alineada con la integración existente:
 *   Guardar el binario del PDF DENTRO de la misma base de datos Turso, en una
 *   tabla propia (`UploadedFile`) con columna BLOB. Así:
 *     - No se depende del filesystem del servidor (cero errores ENOENT/EROFS).
 *     - El archivo comparte ciclo de vida, persistencia y consistencia con los
 *       metadatos (EngineeringDocument.filepath guarda la clave `db:<key>`).
 *     - Funciona igual en Lambda, Vercel, Docker o desarrollo local.
 *
 * Compatibilidad (sin afectar la lógica de negocio):
 *   - getBinaryForStoredPath(): resuelve rutas nuevas ("db:...") desde la BD y
 *     rutas antiguas (filesystem) desde el disco, para no perder documentos ya
 *     subidos antes del cambio.
 *   - deleteStoredFile(): elimina la fila de la BD o el archivo en disco según
 *     corresponda; nunca lanza si el objetivo ya no existe.
 */
import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { getUploadRootDir } from "./upload-storage";

export const DB_PATH_PREFIX = "db:";
const FILE_TABLE = "UploadedFile";

let dbClientSingleton: Client | null = null;

function isTestEnv(): boolean {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true";
}

/**
 * Cliente libSQL directo (misma variable de entorno que usa Prisma en
 * src/lib/prisma.ts). Se crea una sola vez por instancia/calo.
 */
export function getLibSqlClient(): Client {
  if (!dbClientSingleton) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) {
      throw new Error(
        "TURSO_DATABASE_URL no está configurada; no se puede acceder al almacén de archivos en la base de datos."
      );
    }
    dbClientSingleton = createClient({
      url,
      authToken: authToken ?? undefined,
    });
  }
  return dbClientSingleton;
}

/**
 * Crea la tabla de archivos si no existe (idempotente).
 * En Turso las bases nuevas se aprovisionan con prisma/turso_init.sql, pero
 * esta garantía en runtime evita el fallo silencioso en BD existentes que aún
 * no tengan la tabla. Se omite en tests unitarios sin acceso a la BD.
 */
export async function ensureUploadedFileTable(): Promise<void> {
  if (isTestEnv()) return;
  const client = getLibSqlClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "${FILE_TABLE}" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "contentType" TEXT NOT NULL DEFAULT 'application/pdf',
      "sizeBytes" INTEGER NOT NULL DEFAULT 0,
      "data" BLOB NOT NULL,
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/** Guarda el binario y devuelve el filepath relativo a guardar en la BD. */
export async function saveBinaryToDb(key: string, buffer: Buffer, contentType = "application/pdf"): Promise<string> {
  await ensureUploadedFileTable();
  const client = getLibSqlClient();
  await client.execute({
    sql: `INSERT OR REPLACE INTO "${FILE_TABLE}" ("key", "contentType", "sizeBytes", "data") VALUES (?, ?, ?, ?)`,
    args: [key, contentType, buffer.byteLength, new Uint8Array(buffer)],
  });
  return `${DB_PATH_PREFIX}${key}`;
}

/** Lee el binario desde la BD. Devuelve null si la fila no existe. */
export async function readBinaryFromDb(key: string): Promise<Buffer | null> {
  if (isTestEnv()) return null;
  const client = getLibSqlClient();
  const result = await client.execute({
    sql: `SELECT "data" FROM "${FILE_TABLE}" WHERE "key" = ? LIMIT 1`,
    args: [key],
  });
  const row = result.rows[0];
  if (!row) return null;
  const value = row["data"];
  if (value == null) return null;
  if (typeof value === "string") return Buffer.from(value, "utf-8");
  return Buffer.from(value as ArrayBuffer);
}

/** Elimina el binario de la BD (no lanza si ya no existe). */
export async function deleteBinaryFromDb(key: string): Promise<void> {
  if (isTestEnv()) return;
  try {
    const client = getLibSqlClient();
    await client.execute({
      sql: `DELETE FROM "${FILE_TABLE}" WHERE "key" = ?`,
      args: [key],
    });
  } catch (err) {
    console.warn(`[upload-storage-db] No se pudo eliminar el archivo de la BD (key=${key}):`, err);
  }
}

/**
 * Resuelve el contenido binario de un documento a partir del valor guardado
 * en EngineeringDocument.filepath:
 *   - "db:<key>"  -> se lee de la tabla UploadedFile (Turso).
 *   - otra ruta   -> legado: se lee del filesystem (comportamiento anterior).
 */
export async function getBinaryForStoredPath(storedPath: string): Promise<{ buffer: Buffer; missingError?: string } | null> {
  if (storedPath.startsWith(DB_PATH_PREFIX)) {
    const key = storedPath.slice(DB_PATH_PREFIX.length);
    const buffer = await readBinaryFromDb(key);
    if (!buffer) return null;
    return { buffer };
  }

  // Ruta legada en disco (subidas anteriores a la migración a Turso).
  const absPath = path.join(getUploadRootDir(), storedPath);
  try {
    const buffer = await fs.promises.readFile(absPath);
    return { buffer };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return {
        buffer: Buffer.alloc(0),
        missingError:
          "El archivo físico de este plano ya no está disponible en el servidor (documentos antiguos almacenados en disco). Vuelve a subirlo.",
      };
    }
    throw err;
  }
}

/**
 * Elimina el recurso asociado a un filepath (fila en BD o archivo en disco).
 * Nunca lanza: solo registra advertencias.
 */
export async function deleteStoredFile(storedPath: string): Promise<void> {
  if (!storedPath) return;
  if (storedPath.startsWith(DB_PATH_PREFIX)) {
    await deleteBinaryFromDb(storedPath.slice(DB_PATH_PREFIX.length));
    return;
  }
  try {
    await fs.promises.unlink(path.join(getUploadRootDir(), storedPath));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.warn("[upload-storage-db] Aviso al eliminar archivo legado en disco:", err);
    }
  }
}
