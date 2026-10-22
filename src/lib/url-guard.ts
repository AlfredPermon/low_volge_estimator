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

/** Convierte un grupo hexadecimal IPv6 ("c14") a número; NaN si inválido. */
function toGroup(hex: string): number {
  return /^[0-9a-fA-F]{1,4}$/.test(hex) ? parseInt(hex, 16) : NaN;
}

/** Convierte una IPv6 (incluida notación abreviada "::") en 8 grupos de 16 bits. */
function ipv6ToGroups(ip: string): number[] | null {
  let s = ip.toLowerCase();
  // Zona de enlace local (fe80::1%eth0) → se ignora la zona para clasificar el prefijo
  const pct = s.indexOf('%');
  if (pct !== -1) s = s.slice(0, pct);
  if (!s.includes(':')) return null;

  // Sufijo IPv4 embebido (::ffff:1.2.3.4, ::1.2.3.4, 6to4, etc.)
  let tailGroups: number[] = [];
  const dotIdx = s.lastIndexOf('.');
  if (dotIdx !== -1) {
    const lastColon = s.lastIndexOf(':');
    if (dotIdx > lastColon) {
      const embedded = ipv4ToLong(s.slice(lastColon + 1));
      if (embedded === null) return null;
      tailGroups = [(embedded >>> 16) & 0xffff, embedded & 0xffff];
      s = s.slice(0, lastColon + 1);
      // Casos "::ffff:" y "::" tras recortar el IPv4 → un solo ":" remanente
      if (s.endsWith('::')) s += '0:';
    }
  }

  const doubleColon = s.indexOf('::');
  if (doubleColon !== -1 && s.indexOf('::', doubleColon + 1) !== -1) return null; // "::" duplicado

  let groups: number[];
  if (doubleColon === -1) {
    // Forma expandida: se toleran los ":" de borde (split produce "" inicial/final)
    const parts = s.split(':').filter((p, i, arr) => !(p === '' && (i === 0 || i === arr.length - 1)));
    if (parts.length !== 8) return null;
    groups = parts.map(toGroup);
  } else {
    const left = s.slice(0, doubleColon).split(':').filter(Boolean).map(toGroup);
    const right = s.slice(doubleColon + 2).split(':').filter(Boolean).map(toGroup);
    const total = left.length + right.length + tailGroups.length;
    if (total > 7) return null;

    const fill = Array(8 - total).fill(0);
    groups = [...left, ...fill, ...right, ...tailGroups];
  }

  if (groups.length !== 8 || groups.some((g) => !Number.isFinite(g) || g < 0 || g > 0xffff)) {
    return null;
  }
  return groups;
}

/**
 * true si la IP (IPv4 o IPv6) es privada/link-local/loopback/multicast/reservada
 * o dirección de metadatos cloud.
 *
 * HISTORIAL (issue persistente de notificaciones a Teams): versiones anteriores
 * devolvían `true` para CUALQUIER IPv6 literal porque solo existía parsing de
 * IPv4. Los hosts de Power Platform / Microsoft (p. ej. *.environment.api.powerplatform.com,
 * *.logic.azure.com) resuelven también a IPv6 globales del rango 2600::/12 (asignado
 * legítimamente a Microsoft por IANA), y `lookup(all:true)` las devolvía → el guard
 * bloqueaba el webhook con "dirección privada o reservada" y la notificación nunca
 * llegaba a Teams. Ahora se parsea IPv6 y solo se bloquean rangos realmente privados
 * o reservados; cualquier IPv6 global válido se permite.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();

  // ── IPv6 ────────────────────────────────────────────────────────────────
  if (v.includes(':')) {
    // IPv4-mapped IPv6 (::ffff:a.b.c.d y formas antiguas ::a.b.c.d)
    const mapped = v.match(/^(?:::ffff:|::)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (mapped) return isPrivateOrReservedIp(mapped[1]);

    const g = ipv6ToGroups(v);
    if (g === null) return true; // no parseable → deny by default

    const [w0, w1, w2, w3] = g;
    if (w0 === 0 && w1 === 0 && w2 === 0 && w3 === 0) {
      // ::/96 — unspecified y IPv4-compatible heredados (obsoletos, reservar)
      return true;
    }
    if (w0 === 0 && w1 === 0 && w2 === 0 && w3 === 1) return true;   // ::/128 loopback
    if ((w0 & 0xfe00) === 0xfc00) return true;                        // fc00::/7 unique-local
    if ((w0 & 0xffc0) === 0xfe80) return true;                        // fe80::/10 link-local
    if ((w0 & 0xff00) === 0xff00) return true;                        // ff00::/8 multicast
    if (w0 === 0x2001 && (w1 & 0xff00) === 0xdb00) return true;       // 2001:db8::/32 documentaci
    if (w0 === 0x2001 && w1 === 0 && w2 === 0) return true;            // 2001::/32 Teredo
    if (w0 === 0x2001 && w1 === 0x0410 && (w2 & 0xfff0) === 0) return true; // 2001:10::/28 ORCHID
    if (w0 === 0x3ffe) return true;                                    // 3ffe::/16 legacy 6bone
    if (w0 === 0x0100 && w1 === 0 && w2 === 0 && w3 === 0) return true; // 0100::/64 Discard-only
    if (w0 >= 0x4000) return true;                                     // 4000::/3 reservado IETF
    // Resto (2001:4800 Google, 2400 ARIN/APNIC, 2600::/12 Microsoft, 2a00/2a01 RIPE…) → GLOBAL
    return false;
  }

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
