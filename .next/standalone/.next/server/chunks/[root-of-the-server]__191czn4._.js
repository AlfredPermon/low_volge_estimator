module.exports=[93695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},18622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},63021,(e,t,a)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},43793,98043,e=>{"use strict";var t=e.i(63021);let a=globalThis.prisma??new t.PrismaClient({log:["error","warn"]});e.s(["prisma",0,a],98043);let r=globalThis;async function s(){if(!r.schemaEnsured){r.schemaEnsured=!0;try{let e=await a.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table';"),t=new Set(Array.isArray(e)?e.map(e=>e.name):[]);t.has("User")||(await a.$executeRawUnsafe(`
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
      `),await a.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");')),t.has("Session")||(await a.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "token" TEXT NOT NULL UNIQUE,
          "expiresAt" DATETIME NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");'),await a.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");'));let r=await a.$queryRawUnsafe("PRAGMA table_info(Estimate);"),s=new Set(Array.isArray(r)?r.map(e=>e.name):[]);s.has("hasManualEdits")||await a.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN hasManualEdits BOOLEAN NOT NULL DEFAULT 0;"),s.has("floorplanConfig")||await a.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN floorplanConfig TEXT NOT NULL DEFAULT '{}';"),s.has("userId")||(await a.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN userId TEXT;"),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Estimate_userId_idx" ON "Estimate"("userId");'));let E=await a.$queryRawUnsafe("PRAGMA table_info(PriceItem);");new Set(Array.isArray(E)?E.map(e=>e.name):[]).has("userId")||(await a.$executeRawUnsafe("ALTER TABLE PriceItem ADD COLUMN userId TEXT;"),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceItem_userId_idx" ON "PriceItem"("userId");')),t.has("EstimateHistory")||(await a.$executeRawUnsafe(`
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
      `),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EstimateHistory_estimateId_idx" ON "EstimateHistory"("estimateId");'),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EstimateHistory_createdAt_idx" ON "EstimateHistory"("createdAt");')),t.has("PriceHistory")||(await a.$executeRawUnsafe(`
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
      `),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceHistory_priceItemId_idx" ON "PriceHistory"("priceItemId");'),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceHistory_createdAt_idx" ON "PriceHistory"("createdAt");'))}catch(e){console.error("Auto-migration error:",e)}}}e.s(["db",0,a,"ensureDatabaseSchema",0,s],43793)},43609,e=>{"use strict";let t={ml:"ML","m.l.":"ML","m.l":"ML",m:"ML",mts:"ML","mts.":"ML",metro:"ML",metros:"ML",pza:"PZA","pza.":"PZA",pz:"PZA","pz.":"PZA",pieza:"PZA",piezas:"PZA",pzas:"PZA","pzas.":"PZA",unidad:"PZA",unidades:"PZA",lote:"LOTE",lotes:"LOTE",servicio:"SERV",servicios:"SERV",bobina:"ROLLO",bobinas:"ROLLO",rollo:"ROLLO",rollos:"ROLLO",kg:"KG",kilo:"KG",kilos:"KG"},a=new Set(["ML","PZA","LOTE","SERV","ROLLO","KG","M2","M3"]);e.s(["isCanonicalUnit",0,function(e){return a.has(String(e).toUpperCase())},"normalizeUnit",0,function(e){if(!e)return"PZA";let r=String(e).trim().toLowerCase();if(!r)return"PZA";if(t[r])return t[r];let s=r.toUpperCase();return a.has(s),s}])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__191czn4._.js.map