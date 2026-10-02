/**
 * ─────────────────────────────────────────────────────────────────────────────
 * bootstrap-admin.ts — Creación del primer administrador (CLI, solo ops)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Reemplaza al antiguo endpoint HTTP `/api/auth/seed-admin` (V1 crítica):
 * ya NO existe ninguna ruta pública capaz de crear roles elevados.
 * Este script se ejecuta fuera del ciclo request/response, solo por un operador:
 *
 *   npx tsx scripts/bootstrap-admin.ts admin@empresa.com "ContraseñaFuerte#2026" "Nombre"
 *
 * - Crea el usuario con hash PBKDF2 fuerte y rol 'admin'.
 * - Si el usuario ya existe, le asciende a admin únicamente con confirmación
 *   explícita (--promote).
 */

import { PrismaClient } from '@prisma/client';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Uso: npx tsx scripts/bootstrap-admin.ts <email> <password> [nombre] [--promote]');
    process.exit(1);
  }

  const email = args[0].toLowerCase().trim();
  const password = args[1];
  const name = args[2] && !args[2].startsWith('--') ? args[2] : 'Administrador Principal';
  const allowPromote = args.includes('--promote');

  if (password.length < 10) {
    console.error('❌ La contraseña debe tener al menos 10 caracteres.');
    process.exit(1);
  }

  // Hash PBKDF2 (mismo formato que src/lib/auth.ts → verifyPasswordAsync)
  const ITERATIONS = 120_000;
  const saltBytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(saltBytes);
  const salt = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes as unknown as ArrayBuffer, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    32 * 8
  );
  const hashHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const passwordHash = `pbkdf2$${ITERATIONS}$${salt}$${hashHex}`;

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (!allowPromote) {
        console.error(`⚠️  El usuario ${email} ya existe (rol: ${existing.role}). Usa --promote para ascenderlo a admin.`);
        process.exit(2);
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'admin', active: true, passwordHash },
      });
      console.log(`✅ Usuario existente ${email} ascendido a admin y contraseña rotada.`);
      return;
    }

    const { randomUUID } = await import('node:crypto');
    await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        name,
        passwordHash,
        role: 'admin',
        active: true,
        emailVerified: true,
      },
    });
    console.log(`✅ Administrador creado: ${email}. Cambia la contraseña tras el primer login.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Error en bootstrap-admin:', err);
  process.exit(1);
});
