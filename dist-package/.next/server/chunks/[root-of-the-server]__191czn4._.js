module.exports=[93695,(e,a,t)=>{a.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},18622,(e,a,t)=>{a.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,a,t)=>{a.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,a,t)=>{a.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,a,t)=>{a.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,a,t)=>{a.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},63021,(e,a,t)=>{a.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},43793,98043,e=>{"use strict";var a=e.i(63021);let t=globalThis.prisma??new a.PrismaClient({log:["error","warn"]});e.s(["prisma",0,t],98043);let s=globalThis;async function E(){if(!s.schemaEnsured){s.schemaEnsured=!0;try{let e=await t.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table';"),a=new Set(Array.isArray(e)?e.map(e=>e.name):[]);a.has("User")||(await t.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "passwordHash" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'OPERATIVO',
          "active" BOOLEAN NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `),await t.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");')),a.has("Session")||(await t.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "token" TEXT NOT NULL UNIQUE,
          "expiresAt" DATETIME NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `),await t.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");'),await t.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");'));let s=await t.$queryRawUnsafe("PRAGMA table_info(Estimate);"),E=new Set(Array.isArray(s)?s.map(e=>e.name):[]);for(let e of(E.has("hasManualEdits")||await t.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN hasManualEdits BOOLEAN NOT NULL DEFAULT 0;"),E.has("floorplanConfig")||await t.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN floorplanConfig TEXT NOT NULL DEFAULT '{}';"),E.has("userId")||(await t.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN userId TEXT;"),await t.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Estimate_userId_idx" ON "Estimate"("userId");')),E.has("projectManager")||await t.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN projectManager TEXT NOT NULL DEFAULT '';"),E.has("startDate")||await t.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN startDate TEXT NOT NULL DEFAULT '';"),E.has("endDate")||await t.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN endDate TEXT NOT NULL DEFAULT '';"),E.has("techResponsable")||await t.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN techResponsable TEXT NOT NULL DEFAULT '';"),E.has("envResponsable")||await t.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN envResponsable TEXT NOT NULL DEFAULT '';"),E.has("riskResponsable")||await t.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN riskResponsable TEXT NOT NULL DEFAULT '';"),["utilityFactor","subtotalUtility"]))if(E.has(e))try{await t.$executeRawUnsafe(`ALTER TABLE Estimate DROP COLUMN "${e}";`)}catch(a){console.warn(`No se pudo eliminar la columna legacy Estimate.${e}:`,a)}let r=await t.$queryRawUnsafe("PRAGMA table_info(PriceItem);");new Set(Array.isArray(r)?r.map(e=>e.name):[]).has("userId")||(await t.$executeRawUnsafe("ALTER TABLE PriceItem ADD COLUMN userId TEXT;"),await t.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceItem_userId_idx" ON "PriceItem"("userId");')),a.has("EstimateHistory")||(await t.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "EstimateHistory" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "estimateId" TEXT NOT NULL,
          "changeType" TEXT NOT NULL,
          "user" TEXT NOT NULL DEFAULT 'Sistema / Usuario',
          "details" TEXT NOT NULL,
          "snapshot" TEXT NOT NULL DEFAULT '{}',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "EstimateHistory_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `),await t.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EstimateHistory_estimateId_idx" ON "EstimateHistory"("estimateId");'),await t.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EstimateHistory_createdAt_idx" ON "EstimateHistory"("createdAt");')),a.has("PriceHistory")||(await t.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PriceHistory" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "priceItemId" TEXT NOT NULL,
          "previousCost" REAL NOT NULL DEFAULT 0,
          "newCost" REAL NOT NULL DEFAULT 0,
          "delta" REAL NOT NULL DEFAULT 0,
          "deltaPercent" REAL NOT NULL DEFAULT 0,
          "changedBy" TEXT NOT NULL DEFAULT '',
          "reason" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PriceHistory_priceItemId_fkey" FOREIGN KEY ("priceItemId") REFERENCES "PriceItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `),await t.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceHistory_priceItemId_idx" ON "PriceHistory"("priceItemId");'),await t.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceHistory_createdAt_idx" ON "PriceHistory"("createdAt");'))}catch(e){console.error("Auto-migration error:",e)}}}e.s(["db",0,t,"ensureDatabaseSchema",0,E],43793)},43609,e=>{"use strict";let a={ml:"ML","m.l.":"ML","m.l":"ML",m:"ML",mts:"ML","mts.":"ML",metro:"ML",metros:"ML",pza:"PZA","pza.":"PZA",pz:"PZA","pz.":"PZA",pieza:"PZA",piezas:"PZA",pzas:"PZA","pzas.":"PZA",unidad:"PZA",unidades:"PZA",lote:"LOTE",lotes:"LOTE",servicio:"SERV",servicios:"SERV",bobina:"ROLLO",bobinas:"ROLLO",rollo:"ROLLO",rollos:"ROLLO",kg:"KG",kilo:"KG",kilos:"KG"},t=new Set(["ML","PZA","LOTE","SERV","ROLLO","KG","M2","M3"]);e.s(["isCanonicalUnit",0,function(e){return t.has(String(e).toUpperCase())},"normalizeUnit",0,function(e){if(!e)return"PZA";let s=String(e).trim().toLowerCase();if(!s)return"PZA";if(a[s])return a[s];let E=s.toUpperCase();return t.has(E),E}])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__191czn4._.js.map