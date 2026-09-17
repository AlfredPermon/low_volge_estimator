module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},63021,(e,t,r)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},43793,e=>{"use strict";var t=e.i(63021);let r=globalThis,a=r.prisma??new t.PrismaClient({log:["query"]});async function s(){if(!r.schemaEnsured){r.schemaEnsured=!0;try{let e=await a.$queryRawUnsafe("PRAGMA table_info(Estimate);");Array.isArray(e)&&e.some(e=>"hasManualEdits"===e.name)||await a.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN hasManualEdits BOOLEAN NOT NULL DEFAULT 0;"),Array.isArray(e)&&e.some(e=>"floorplanConfig"===e.name)||await a.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN floorplanConfig TEXT NOT NULL DEFAULT '{}';");let t=await a.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table';");Array.isArray(t)&&t.some(e=>"EstimateHistory"===e.name)||(await a.$executeRawUnsafe(`
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
      `),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EstimateHistory_estimateId_idx" ON "EstimateHistory"("estimateId");'),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EstimateHistory_createdAt_idx" ON "EstimateHistory"("createdAt");')),Array.isArray(t)&&t.some(e=>"PriceHistory"===e.name)||(await a.$executeRawUnsafe(`
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
      `),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceHistory_priceItemId_idx" ON "PriceHistory"("priceItemId");'),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceHistory_createdAt_idx" ON "PriceHistory"("createdAt");'))}catch(e){console.error("Auto-migration error:",e)}}}e.s(["db",0,a,"ensureDatabaseSchema",0,s])},43609,e=>{"use strict";let t={ml:"ML","m.l.":"ML","m.l":"ML",m:"ML",mts:"ML","mts.":"ML",metro:"ML",metros:"ML",pza:"PZA","pza.":"PZA",pz:"PZA","pz.":"PZA",pieza:"PZA",piezas:"PZA",pzas:"PZA","pzas.":"PZA",unidad:"PZA",unidades:"PZA",lote:"LOTE",lotes:"LOTE",servicio:"SERV",servicios:"SERV",bobina:"ROLLO",bobinas:"ROLLO",rollo:"ROLLO",rollos:"ROLLO",kg:"KG",kilo:"KG",kilos:"KG"},r=new Set(["ML","PZA","LOTE","SERV","ROLLO","KG","M2","M3"]);e.s(["isCanonicalUnit",0,function(e){return r.has(String(e).toUpperCase())},"normalizeUnit",0,function(e){if(!e)return"PZA";let a=String(e).trim().toLowerCase();if(!a)return"PZA";if(t[a])return t[a];let s=a.toUpperCase();return r.has(s),s}])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__191czn4._.js.map