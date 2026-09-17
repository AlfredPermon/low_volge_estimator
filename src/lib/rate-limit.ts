interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Valida la tasa de peticiones para una clave (IP o Usuario) en una ventana de tiempo.
 * @param key Identificador único (ej: ip + endpoint)
 * @param maxHits Número máximo de peticiones permitidas
 * @param windowMs Tamaño de la ventana en milisegundos (por defecto 1 minuto)
 */
export function checkRateLimit(
  key: string,
  maxHits: number = 10,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Limpieza periódica de registros viejos
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) rateLimitStore.delete(k);
    }
  }

  if (!record || record.resetAt < now) {
    const newRecord: RateLimitRecord = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, newRecord);
    return { success: true, remaining: maxHits - 1, resetAt: newRecord.resetAt };
  }

  if (record.count >= maxHits) {
    return { success: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return { success: true, remaining: maxHits - record.count, resetAt: record.resetAt };
}
