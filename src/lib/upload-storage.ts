/**
 * Upload storage resolver for local filesystem persistence (planos PDF, etc.)
 *
 * Contexto del bug corregido:
 *   "ENOENT: no such file or directory, mkdir '/var/task/uploads'"
 *   En AWS Lambda (/var/task) el directorio de la app es READ-ONLY, por lo que
 *   intentar crear "uploads" ahí falla siempre. Adicionalmente, en plataformas
 *   serverless el disco local es EFÍMERO: desaparece entre invocaciones.
 *
 * Estrategia (sin afectar la lógica de negocio):
 *   1. Si LVE_UPLOAD_DIR está definida y es usable -> se usa (p. ej. /mnt/data
 *      en Lambda con EFS, o un volumen montado en Docker/VPS).
 *   2. Si no está definida, se intenta ./uploads relativo a process.cwd()
 *      (comportamiento original para desarrollo local, VPS y Docker). Si el
 *      entorno no permite escribir ahí (caso Lambda), se hace fallback a un
 *      directorio temporal del sistema (/tmp/uploads-lve) que SIEMPRE es
 *      escribible en Lambda.
 *      IMPORTANTE: si LVE_UPLOAD_DIR está definida pero NO es usable, se lanza
 *      una excepción clara (configuración explícita mal hecha) en lugar de
 *      guardar en silencio en un directorio efímero, para evitar pérdida de
 *      datos inesperada.
 *   3. El resultado se cachea por proceso para no repetir las pruebas de acceso.
 *
 * Nota de persistencia: en serverless sin volumen persistente los archivos son
 * temporales (vida de la instancia). Para producción duradera se recomienda
 * apuntar LVE_UPLOAD_DIR a un almacenamiento compartido (EFS/S3 u objeto).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FALLBACK_TMP_DIRNAME = "uploads-lve";

let cachedRootDir: string | null = null;

function isWritableDir(dir: string): boolean {
  try {
    // mkdir recursive es idempotente: si ya existe, no lanza.
    fs.mkdirSync(dir, { recursive: true });
    // Comprueba permisos reales de escritura (no solo existencia).
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function normalizeEnvDir(): string | null {
  const envDir = process.env.LVE_UPLOAD_DIR;
  if (typeof envDir === "string" && envDir.trim()) return envDir.trim();
  return null;
}

/**
 * Devuelve la raíz absoluta donde se almacenan los archivos subidos.
 * Garantiza que el directorio exista y sea escribible antes de devolverlo.
 */
export function getUploadRootDir(): string {
  if (cachedRootDir) return cachedRootDir;

  const envDir = normalizeEnvDir();

  // Configuración explícita: debe funcionar o fallar con mensaje claro.
  if (envDir) {
    if (isWritableDir(envDir)) {
      cachedRootDir = envDir;
      return cachedRootDir;
    }
    throw new Error(
      `LVE_UPLOAD_DIR apunta a un directorio no escribible o inexistente: "${envDir}". ` +
        `Verifica que la ruta esté montada (p. ej. EFS/volumen) y tenga permisos de escritura.`
    );
  }

  // Sin configuración: comportamiento histórico (./uploads) con fallback seguro.
  const candidates: string[] = [
    path.join(process.cwd(), "uploads"),
    path.join(os.tmpdir(), FALLBACK_TMP_DIRNAME),
  ];

  for (const candidate of candidates) {
    if (isWritableDir(candidate)) {
      cachedRootDir = candidate;
      return cachedRootDir;
    }
    console.warn(
      `[upload-storage] Directory not writable, trying next candidate: ${candidate}`
    );
  }

  // Último recurso: debería ser inalcanzable porque os.tmpdir() es escribible
  // en Lambda; se devuelve igualmente para no romper la request con una excepción.
  const lastResort = path.join(os.tmpdir(), FALLBACK_TMP_DIRNAME);
  cachedRootDir = lastResort;
  return cachedRootDir;
}

/** Resetea el cache (solo para pruebas). */
export function __resetUploadRootDirCacheForTests(): void {
  cachedRootDir = null;
}
