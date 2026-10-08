#!/usr/bin/env node
/**
 * build-seed-db.cjs — Construye la base de datos semilla para la distribución.
 *
 *   1. Crea un archivo SQLite vacío.
 *   2. Aplica el esquema COMPLETO (db-schema.sql, generado desde prisma/schema.prisma).
 *   3. Copia SOLO el catálogo (PriceItem, CustomField) desde la BD de origen.
 *   4. Crea el administrador inicial.
 *
 * Uso: node scripts/build-seed-db.cjs --source <origen.db> --out <seed.db>
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { migrate, upsertAdmin, toPrismaUrl } = require('./db-tools.cjs');

const CATALOG_TABLES = ['PriceItem', 'CustomField'];

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const source = path.resolve(arg('source') || path.join(__dirname, '..', 'prisma', 'db', 'custom.db'));
  const out = path.resolve(arg('out') || path.join(__dirname, '..', 'dist-package', 'db', 'seed_custom.db'));

  if (!fs.existsSync(source)) throw new Error(`BD de origen no encontrada: ${source}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  for (const f of [out, `${out}-journal`, `${out}-wal`, `${out}-shm`]) if (fs.existsSync(f)) fs.rmSync(f);
  fs.writeFileSync(out, ''); // archivo vacío = BD SQLite vacía válida

  console.log(`Origen : ${source}`);
  console.log(`Destino: ${out}`);

  // connection_limit=1 → ATTACH y los INSERT usan la misma conexión
  const db = new PrismaClient({ datasourceUrl: `${toPrismaUrl(out)}?connection_limit=1` });
  try {
    await migrate(db);

    await db.$executeRawUnsafe(`ATTACH DATABASE '${source.replace(/'/g, "''")}' AS src`);
    for (const table of CATALOG_TABLES) {
      const srcCols = (await db.$queryRawUnsafe(`PRAGMA src.table_info("${table}")`)).map((c) => c.name);
      if (srcCols.length === 0) { console.warn(`  [!] ${table} no existe en origen; se omite.`); continue; }
      const dstCols = new Set((await db.$queryRawUnsafe(`PRAGMA main.table_info("${table}")`)).map((c) => c.name));
      const cols = srcCols.filter((c) => dstCols.has(c)).map((c) => `"${c}"`).join(', ');
      await db.$executeRawUnsafe(`INSERT INTO main."${table}" (${cols}) SELECT ${cols} FROM src."${table}"`);
      const n = await db.$queryRawUnsafe(`SELECT COUNT(*) AS c FROM main."${table}"`);
      console.log(`  [+] ${table}: ${Number(n[0].c)} filas copiadas`);
    }
    // El catálogo no debe quedar ligado a usuarios de desarrollo
    await db.$executeRawUnsafe('UPDATE main."PriceItem" SET "userId" = NULL');
    await db.$executeRawUnsafe('DETACH DATABASE src');

    await upsertAdmin(db, { email: 'admin.jose@empresa.com', password: 'AdminPassword123!', name: 'José Administrador' });
    await db.$executeRawUnsafe('VACUUM');

    const users = await db.user.count();
    const tables = (await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).map((t) => t.name);
    console.log(`  Tablas (${tables.length}): ${tables.join(', ')}`);
    console.log(`  Usuarios: ${users}`);
    console.log('[OK] Base semilla generada.');
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => { console.error('[ERROR]', e.message || e); process.exit(1); });
