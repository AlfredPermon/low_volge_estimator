#!/usr/bin/env node
/**
 * db-tools.cjs — Herramienta de mantenimiento de la base de datos SQLite.
 *
 * Sin dependencias externas: solo usa @prisma/client (incluido en el build
 * standalone) y node:crypto. Funciona igual en desarrollo y en el paquete dist.
 *
 * Comandos:
 *   migrate        Crea tablas, columnas e índices faltantes a partir de
 *                  db-schema.sql (generado desde prisma/schema.prisma).
 *   ensure-admin   migrate + crea el admin inicial SOLO si no existe ningún
 *                  administrador activo.
 *   reset-admin    migrate + crea/restablece el admin y su contraseña.
 *
 * Opciones:
 *   --db <ruta>        Ruta al archivo .db (por defecto: <app>/db/custom.db)
 *   --email <correo>   Correo del admin (por defecto: admin.jose@empresa.com)
 *   --password <pwd>   Contraseña del admin (por defecto: AdminPassword123!)
 *   --quiet            Solo imprime errores y cambios aplicados.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_ADMIN = {
  email: 'admin.jose@empresa.com',
  password: 'AdminPassword123!',
  name: 'José Administrador',
};

// ─── Argumentos ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    } else args._.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const quiet = !!args.quiet;
const log = (...m) => { if (!quiet) console.log(...m); };

// ─── Resolución de la ruta de la BD ──────────────────────────────────────────
function resolveDbPath() {
  if (typeof args.db === 'string') return path.resolve(args.db);
  // <app>/scripts/db-tools.cjs → <app>/db/custom.db
  return path.resolve(__dirname, '..', 'db', 'custom.db');
}

function toPrismaUrl(absPath) {
  return 'file:' + absPath.replace(/\\/g, '/');
}

// ─── Hash compatible con Better Auth (scrypt N=16384, r=16, p=1, 64 bytes) ──
function hashPasswordBetterAuth(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password.normalize('NFKC'), salt, 64, {
    N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${key.toString('hex')}`;
}

function cuidLike() {
  return 'c' + Date.now().toString(36) + crypto.randomBytes(8).toString('hex');
}

// ─── Parser del DDL generado por `prisma migrate diff --script` ──────────────
function parseSchemaSql(sql) {
  const statements = sql
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const tables = [];
  const indexes = [];
  for (const stmt of statements) {
    const t = stmt.match(/^CREATE TABLE "([^"]+)" \(([\s\S]*)\)$/);
    if (t) {
      const columns = [];
      for (let line of t[2].split('\n')) {
        line = line.trim().replace(/,$/, '');
        const c = line.match(/^"([^"]+)"\s+(.*)$/);
        if (c) columns.push({ name: c[1], def: c[2] });
      }
      tables.push({ name: t[1], sql: stmt, columns });
      continue;
    }
    const i = stmt.match(/^CREATE (UNIQUE )?INDEX "([^"]+)" ON "([^"]+)"/);
    if (i) {
      indexes.push({
        name: i[2],
        table: i[3],
        sql: stmt.replace(/^CREATE (UNIQUE )?INDEX /, (m) => m + 'IF NOT EXISTS '),
      });
    }
  }
  return { tables, indexes };
}

/** Adapta una definición de columna para `ALTER TABLE ... ADD COLUMN` (restricciones SQLite). */
function columnDefForAlter(def) {
  let d = def.replace(/\s+PRIMARY KEY/i, '');
  const nowMs = String(Date.now()); // Prisma guarda DateTime como epoch-ms en SQLite
  d = d.replace(/DEFAULT CURRENT_TIMESTAMP/i, `DEFAULT ${nowMs}`);
  if (/NOT NULL/i.test(d) && !/DEFAULT/i.test(d)) {
    const type = (d.split(/\s+/)[0] || '').toUpperCase();
    let fallback = "''";
    if (/INT|REAL|DECIMAL|BOOLEAN|NUMERIC|FLOAT|DOUBLE/.test(type)) fallback = '0';
    else if (/DATETIME/.test(type)) fallback = nowMs;
    d += ` DEFAULT ${fallback}`;
  }
  return d;
}

// ─── Migración ────────────────────────────────────────────────────────────────
async function migrate(db) {
  const schemaFile = path.join(__dirname, 'db-schema.sql');
  if (!fs.existsSync(schemaFile)) throw new Error(`No se encontró ${schemaFile}`);
  const { tables, indexes } = parseSchemaSql(fs.readFileSync(schemaFile, 'utf8'));
  if (tables.length === 0) throw new Error('db-schema.sql no contiene tablas.');

  const existing = new Set(
    (await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table'")).map((r) => r.name)
  );

  let changes = 0;
  for (const table of tables) {
    if (!existing.has(table.name)) {
      await db.$executeRawUnsafe(table.sql);
      console.log(`  [+] Tabla creada: ${table.name}`);
      changes++;
      continue;
    }
    const cols = new Set(
      (await db.$queryRawUnsafe(`PRAGMA table_info("${table.name}")`)).map((c) => c.name)
    );
    for (const col of table.columns) {
      if (cols.has(col.name)) continue;
      if (/PRIMARY KEY/i.test(col.def)) {
        console.warn(`  [!] ${table.name}.${col.name} es PK y falta; se omite.`);
        continue;
      }
      await db.$executeRawUnsafe(
        `ALTER TABLE "${table.name}" ADD COLUMN "${col.name}" ${columnDefForAlter(col.def)}`
      );
      console.log(`  [+] Columna agregada: ${table.name}.${col.name}`);
      changes++;
    }
  }

  const existingIdx = new Set(
    (await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='index'")).map((r) => r.name)
  );
  for (const idx of indexes) {
    if (existingIdx.has(idx.name)) continue;
    try {
      await db.$executeRawUnsafe(idx.sql);
      log(`  [+] Índice creado: ${idx.name}`);
      changes++;
    } catch (e) {
      console.warn(`  [!] No se pudo crear el índice ${idx.name}: ${e.message}`);
    }
  }

  log(changes === 0 ? '[OK] Esquema de base de datos al día.' : `[OK] Esquema actualizado (${changes} cambios).`);
}

// ─── Admin ────────────────────────────────────────────────────────────────────
async function upsertAdmin(db, { email, password, name }) {
  const now = new Date();
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: { id: cuidLike(), email, name, role: 'admin', active: true, emailVerified: true },
    });
    console.log(`  [+] Usuario ${email} creado.`);
  } else {
    user = await db.user.update({
      where: { id: user.id },
      data: { role: 'admin', active: true, updatedAt: now },
    });
    console.log(`  [~] Usuario ${email} reactivado como admin.`);
  }

  const hash = hashPasswordBetterAuth(password);
  const updated = await db.account.updateMany({
    where: { userId: user.id, providerId: 'credential' },
    data: { password: hash, updatedAt: now },
  });
  if (updated.count === 0) {
    await db.account.create({
      data: { id: cuidLike(), userId: user.id, accountId: user.id, providerId: 'credential', password: hash },
    });
  }
  // Invalida sesiones previas del admin
  await db.session.deleteMany({ where: { userId: user.id } });
  return user;
}

function printCredentials(email, password) {
  console.log('');
  console.log('===================================================');
  console.log('  CREDENCIALES DE ADMINISTRADOR');
  console.log('===================================================');
  console.log(`  Correo:     ${email}`);
  console.log(`  Contraseña: ${password}`);
  console.log('===================================================');
  console.log('  Cambie la contraseña después de iniciar sesión.');
  console.log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const command = args._[0] || 'migrate';
  if (!['migrate', 'ensure-admin', 'reset-admin'].includes(command)) {
    console.error(`Comando desconocido: ${command}`);
    process.exit(2);
  }

  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    console.error(`[ERROR] Base de datos no encontrada: ${dbPath}`);
    process.exit(1);
  }

  let PrismaClient;
  try {
    ({ PrismaClient } = require('@prisma/client'));
  } catch (e) {
    console.error('[ERROR] No se pudo cargar @prisma/client:', e.message);
    process.exit(1);
  }

  const db = new PrismaClient({ datasourceUrl: toPrismaUrl(dbPath) });
  try {
    // Verifica que Prisma abrió EXACTAMENTE el archivo esperado (rutas con espacios, etc.)
    const list = await db.$queryRawUnsafe('PRAGMA database_list');
    const opened = (list.find((d) => d.name === 'main') || {}).file || '';
    if (path.resolve(opened).toLowerCase() !== dbPath.toLowerCase()) {
      throw new Error(`Prisma abrió "${opened}" en lugar de "${dbPath}".`);
    }
    log(`[OK] Base de datos: ${dbPath}`);

    await migrate(db);

    const email = typeof args.email === 'string' ? args.email.toLowerCase().trim() : DEFAULT_ADMIN.email;
    const password = typeof args.password === 'string' ? args.password : DEFAULT_ADMIN.password;

    if (command === 'reset-admin') {
      await upsertAdmin(db, { email, password, name: DEFAULT_ADMIN.name });
      printCredentials(email, password);
    } else if (command === 'ensure-admin') {
      const admins = await db.user.count({ where: { role: 'admin', active: true } });
      if (admins === 0) {
        await upsertAdmin(db, { email, password, name: DEFAULT_ADMIN.name });
        printCredentials(email, password);
      } else {
        log(`[OK] Administradores activos: ${admins}`);
      }
    }
  } catch (err) {
    console.error('[ERROR]', err.message || err);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) main();

module.exports = { parseSchemaSql, migrate, upsertAdmin, hashPasswordBetterAuth, toPrismaUrl };
