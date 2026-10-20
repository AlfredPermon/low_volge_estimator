import { hashPassword } from 'better-auth/crypto';
import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { hashPasswordAsync } from '../src/lib/auth';
import { ADMIN_ROLE } from '../src/lib/auth-constants';
import prisma from '../src/lib/prisma';

function requiredEnvironment(name: 'ADMIN_EMAIL' | 'ADMIN_INITIAL_PASSWORD'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} es obligatorio para ejecutar la semilla del administrador.`);
  }
  return value;
}

async function ensureTursoSchema(): Promise<void> {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url || !authToken) return;

  const client = createClient({ url, authToken });
  try {
    const existingUserTable = await client.execute(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'User' LIMIT 1"
    );
    if (existingUserTable.rows.length > 0) return;

    const schemaPath = path.join(process.cwd(), 'prisma', 'turso_init.sql');
    const schemaSql = (await readFile(schemaPath, 'utf8'))
      .replace(/^\uFEFF/, '')
      .replace(/^CREATE TABLE /gim, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/^CREATE UNIQUE INDEX /gim, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
      .replace(/^CREATE INDEX /gim, 'CREATE INDEX IF NOT EXISTS ');

    await client.executeMultiple(schemaSql);
    console.log('Esquema Turso inicializado desde prisma/turso_init.sql.');
  } finally {
    client.close();
  }
}

async function main() {
  const email = requiredEnvironment('ADMIN_EMAIL').toLowerCase();
  const password = requiredEnvironment('ADMIN_INITIAL_PASSWORD');
  const name = process.env.ADMIN_NAME?.trim() || 'Administrador Principal';

  if (password.length < 10) {
    throw new Error('ADMIN_INITIAL_PASSWORD debe tener al menos 10 caracteres.');
  }

  await ensureTursoSchema();

  const [passwordHash, credentialPassword] = await Promise.all([
    hashPasswordAsync(password),
    hashPassword(password),
  ]);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      role: ADMIN_ROLE,
      active: true,
      emailVerified: true,
    },
    update: {
      name,
      passwordHash,
      role: ADMIN_ROLE,
      active: true,
      emailVerified: true,
    },
  });

  const credentialAccount = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: 'credential' },
    select: { id: true },
  });
  const credentialAccountId = credentialAccount?.id ?? randomUUID();

  await prisma.account.upsert({
    where: { id: credentialAccountId },
    create: {
      id: credentialAccountId,
      userId: admin.id,
      accountId: admin.id,
      providerId: 'credential',
      password: credentialPassword,
    },
    update: {
      accountId: admin.id,
      password: credentialPassword,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      userEmail: admin.email,
      userRole: ADMIN_ROLE,
      module: 'USUARIOS',
      action: 'SEED_ADMIN',
      result: 'ALLOWED',
    },
  });

  console.log(`Administrador aprovisionado: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error('No se pudo aprovisionar el administrador:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
