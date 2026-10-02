/**
 * ─────────────────────────────────────────────────────────────────────────────
 * url-guard.ts — Protección SSRF (V4) para fetch server-side a URLs de usuario
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Amenazas mitigadas:
 *  • Acceso a red interna (RFC1918, loopback, link-local, IMDS 169.254.169.254)
 *  • Esquemas peligrosos (file:, gopher:, data:)
 *  • Off-box evasion por IP codificada (decimal/hex/octal/IPv6 mapeada)
 *  • DNS rebinding / TOCTOU → se resuelve el hostname y se valida la IP ANTES
 *    del request; los redirects se manejan en modo `manual` y se revalidan.
 */

import { lookup } from 'node:dns/promises';

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfError';
  }
}

/** Esquemas permitidos. Solo https; http se permite únicamente si LVE_ALLOW_HTTP_WEBHOOKS=1. */
function isSchemeAllowed(protocol: string): boolean {
  if (protocol === 'https:') return true;
  if (protocol === 'http:' && process.env.LVE_ALLOW_HTTP_WEBHOOKS === '1') return true;
  return false;
}

/** Convierte IPv4 (incluidas formas decimal/hex/octal normalizadas) a entero de 32 bits. */
function ipv4ToLong(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!part) return null;
    let n: number;
    if (/^0[xX][0-9a-fA-F]+$/.test(part)) n = parseInt(part, 16);
    else if (/^0[0-7]+$/.test(part)) n = parseInt(part, 8);
    else if (/^[0-9]+$/.test(part)) n = parseInt(part, 10);
    else return null;
    if (!Number.isFinite(n) || n < 0 || n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

/** true si la IP es privada/link-local/loopback/multicast/reservada o metadata cloud. */
export function isPrivateOrReservedIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();

  // IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateOrReservedIp(mapped[1]);
  if (v.startsWith('fc') || v.startsWith('fd')) return true; // fc00::/7 unique-local
  if (v === '::1' || v === '::') return true;
  if (v.startsWith('fe80')) return true; // link-local
  if (/^f[0-9a-f]{2}:/.test(v) && !mapped) return true; // multicast/reserved ranges f000::/7

  const long = ipv4ToLong(v);
  if (long === null) return true; // no parseable → deny by default

  const a = (long >>> 24) & 0xff;
  const b = (long >>> 16) & 0xff;

  if (a === 0) return true;                       // 0.0.0.0/8
  if (a === 10) return true;                      // 10/8
  if (a === 127) return true;                     // loopback
  if (a === 169 && b === 254) return true;        // link-local + IMDS cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true;        // 192.168/16
  if (a === 192 && b === 0) return true;          // 192.0.0.0/24 (IETF protocol) + 192.0.2 test-net
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 203 && b === 0 && ((long >>> 8) & 0xff) === 113) return true; // TEST-NET-3
  if (a >= 224) return true;                      // multicast + reservado

  return false;
}

/**
 * Valida una URL proporcionada por el usuario antes de hacer fetch server-side.
 * @throws SsrfError si la URL está prohibida.
 */
export async function assertSafeOutboundUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError('URL inválida.');
  }

  if (!isSchemeAllowed(url.protocol)) {
    throw new SsrfError(`Esquema no permitido: ${url.protocol}. Solo se permiten webhooks HTTPS.`);
  }

  // Rechazar credenciales en la URL (ataques de confusión)
  if (url.username || url.password) {
    throw new SsrfError('La URL no debe contener credenciales.');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!hostname) throw new SsrfError('Hostname vacío.');

  // Si es literal IP → validar directamente
  if (ipv4ToLong(hostname) !== null || hostname.includes(':')) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new SsrfError('El destino apunta a una dirección privada o reservada.');
    }
    return url;
  }

  // Deny hostnames obvios internos
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname === 'metadata.google.internal') {
    throw new SsrfError('El destino apunta a un host interno.');
  }

  // Resolver DNS y validar TODAS las IPs obtenidas (previene round-robin/rebinding básico)
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new SsrfError('No se pudo resolver el host de destino.');
  }
  if (addresses.length === 0) throw new SsrfError('El host de destino no resuelve.');
  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) {
      throw new SsrfError('El host de destino resuelve a una dirección privada o reservada.');
    }
  }

  return url;
}

/**
 * Fetch seguro con validación SSRF, timeout estricto y sin seguir redirects
 * automáticamente (se revalida cada Location manualmente).
 */
export async function safeExternalFetch(
  rawUrl: string,
  init: RequestInit = {},
  timeoutMs = 5000,
  maxRedirects = 2
): Promise<Response> {
  let currentUrl = await assertSafeOutboundUrl(rawUrl);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(currentUrl.toString(), {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
      });

      // 3xx → revalidar Location antes de seguirla
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get('location');
        if (!location) return res;
        if (hop === maxRedirects) throw new SsrfError('Demasiados redirects en el webhook.');
        currentUrl = await assertSafeOutboundUrl(new URL(location, currentUrl).toString());
        continue;
      }

      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new SsrfError('No se pudo completar la solicitud al webhook.');
}
