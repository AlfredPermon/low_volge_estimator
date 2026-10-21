import assert from "node:assert";

// 1) Cliente libSQL REAL contra base local (file:) para validar las sentencias SQL exactas del módulo.
const { createClient } = await import("@libsql/client");
const tmpDb = "/tmp/test-uploads.db";
try { require("fs").unlinkSync(tmpDb); } catch {}
const client = createClient({ url: `file:${tmpDb}` });

await client.execute(`
  CREATE TABLE IF NOT EXISTS "UploadedFile" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "contentType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "data" BLOB NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const pdf = Buffer.from("%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\ntrailer <<>>\n%%EOF");
await client.execute({
  sql: `INSERT OR REPLACE INTO "UploadedFile" ("key", "contentType", "sizeBytes", "data") VALUES (?, ?, ?, ?)`,
  args: ["abc.pdf", "application/pdf", pdf.byteLength, new Uint8Array(pdf)],
});

const res = await client.execute({ sql: `SELECT "data" FROM "UploadedFile" WHERE "key" = ? LIMIT 1`, args: ["abc.pdf"] });
const rowVal: any = res.rows[0]?.["data"];
assert.ok(rowVal, "debe existir la fila");
const back = Buffer.from(rowVal as ArrayBuffer);
assert.deepStrictEqual(back, pdf, "roundtrip BLOB idéntico");
console.log("libSQL roundtrip BLOB OK:", back.subarray(0, 8).toString());

await client.execute({ sql: `DELETE FROM "UploadedFile" WHERE "key" = ?`, args: ["abc.pdf"] });
const res2 = await client.execute({ sql: `SELECT "data" FROM "UploadedFile" WHERE "key" = ? LIMIT 1`, args: ["abc.pdf"] });
assert.strictEqual(res2.rows.length, 0, "delete OK");
console.log("DELETE OK");

// 2) Módulo de la app: legado ENOENT -> mensaje amigable; delete no lanza
process.env.NODE_ENV = "production";
const dbMod: any = await import("/workspace/src/lib/upload-storage-db.ts");
const legacy = await dbMod.getBinaryForStoredPath("schedule/x/engineering/nope.pdf");
assert.ok(legacy && legacy.missingError, "ruta legada faltante debe dar missingError");
console.log("legado ENOENT -> mensaje amigable OK");
await dbMod.deleteStoredFile("schedule/x/engineering/nope.pdf");
console.log("deleteStoredFile legado no lanza OK");

// 3) getUploadRootDir con cwd de solo lectura NO debe lanzar (fallback)
const fs = await import("node:fs");
const os = await import("node:os");
const path = await import("node:path");
const ro = fs.mkdtempSync(path.join(os.tmpdir(), "ro-"));
fs.chmodSync(ro, 0o555);
process.chdir(ro);
delete process.env.LVE_UPLOAD_DIR;
const storageMod: any = await import("/workspace/src/lib/upload-storage.ts");
const root = storageMod.getUploadRootDir();
console.log("upload root con cwd read-only:", root);
assert.ok(fs.existsSync(root) && !root.startsWith(ro), "debe resolver a un directorio escribible fuera del cwd");

console.log("ALL CHECKS PASSED");
