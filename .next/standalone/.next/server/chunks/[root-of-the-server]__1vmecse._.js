module.exports=[93695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},18622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},63021,(e,t,a)=>{t.exports=e.x("@prisma/client-2c3a283f134fdcb6",()=>require("@prisma/client-2c3a283f134fdcb6"))},43793,98043,e=>{"use strict";var t=e.i(63021);let a=globalThis.prisma??new t.PrismaClient({log:["error","warn"]});e.s(["prisma",0,a],98043);let i=globalThis;async function s(){if(!i.schemaEnsured){i.schemaEnsured=!0;try{let e=await a.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table';"),t=new Set(Array.isArray(e)?e.map(e=>e.name):[]);t.has("User")||(await a.$executeRawUnsafe(`
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
      `),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");'),await a.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");'));let i=await a.$queryRawUnsafe("PRAGMA table_info(Estimate);"),s=new Set(Array.isArray(i)?i.map(e=>e.name):[]);s.has("hasManualEdits")||await a.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN hasManualEdits BOOLEAN NOT NULL DEFAULT 0;"),s.has("floorplanConfig")||await a.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN floorplanConfig TEXT NOT NULL DEFAULT '{}';"),s.has("userId")||(await a.$executeRawUnsafe("ALTER TABLE Estimate ADD COLUMN userId TEXT;"),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Estimate_userId_idx" ON "Estimate"("userId");'));let r=await a.$queryRawUnsafe("PRAGMA table_info(PriceItem);");new Set(Array.isArray(r)?r.map(e=>e.name):[]).has("userId")||(await a.$executeRawUnsafe("ALTER TABLE PriceItem ADD COLUMN userId TEXT;"),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceItem_userId_idx" ON "PriceItem"("userId");')),t.has("EstimateHistory")||(await a.$executeRawUnsafe(`
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
      `),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceHistory_priceItemId_idx" ON "PriceHistory"("priceItemId");'),await a.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PriceHistory_createdAt_idx" ON "PriceHistory"("createdAt");'))}catch(e){console.error("Auto-migration error:",e)}}}e.s(["db",0,a,"ensureDatabaseSchema",0,s],43793)},19085,e=>{"use strict";var t=e.i(69719);let a=["Pendiente","Listo para iniciar","En proceso","Bloqueado","En revisión","Terminado"],i=t.z.string().min(1),s=t.z.string().min(1),r=t.z.object({estimateId:s}),n=t.z.object({startDate:t.z.string().datetime().nullable().optional(),endDate:t.z.string().datetime().nullable().optional(),engineeringStatus:t.z.enum(["EXISTE","NO_REQUERIDO","EN_PROCESO","NO_APLICA"]).optional(),engineeringResponsible:t.z.string().optional(),engineeringDueDate:t.z.string().datetime().nullable().optional(),engineeringJustification:t.z.string().optional(),notes:t.z.string().optional()});t.z.object({scheduleId:i,name:t.z.string().min(1),system:t.z.string().default(""),phase:t.z.number().int().min(0).max(99).default(0),startDate:t.z.string().datetime().nullable().optional(),endDate:t.z.string().datetime().nullable().optional(),assigneeRole:t.z.string().default(""),status:t.z.enum(a).default("Pendiente"),progress:t.z.number().min(0).max(100).default(0),dependsOn:t.z.string().default("[]"),risk:t.z.string().default(""),notes:t.z.string().default("")});let o=t.z.object({name:t.z.string().min(1).optional(),system:t.z.string().optional(),phase:t.z.number().int().min(0).max(99).optional(),startDate:t.z.string().datetime().nullable().optional(),endDate:t.z.string().datetime().nullable().optional(),assigneeRole:t.z.string().optional(),status:t.z.enum(a).optional(),progress:t.z.number().min(0).max(100).optional(),dependsOn:t.z.string().optional(),risk:t.z.string().optional(),notes:t.z.string().optional()}),E=t.z.object({scheduleId:i,comparativeRequestedAt:t.z.string().datetime().nullable().optional(),comparativeMinExpectedAt:t.z.string().datetime().nullable().optional(),comparativeReceivedAt:t.z.string().datetime().nullable().optional(),supplierName:t.z.string().optional(),quotedAmount:t.z.number().min(0).optional(),deliveryLeadTimeDays:t.z.number().int().min(0).optional(),paymentTerms:t.z.string().optional(),advancePercent:t.z.number().min(0).max(100).optional(),requisitionNumber:t.z.string().optional(),purchaseOrderNumber:t.z.string().optional(),advanceReleasedAt:t.z.string().datetime().nullable().optional(),supplierPurchaseStartedAt:t.z.string().datetime().nullable().optional(),materialsReceivedAt:t.z.string().datetime().nullable().optional(),releasedForInstallationAt:t.z.string().datetime().nullable().optional(),status:t.z.string().optional(),notes:t.z.string().optional()}),T=t.z.object({scheduleId:i,system:t.z.string().default(""),revision:t.z.string().default(""),status:t.z.enum(["Cargado","En revisión","Aprobado","Rechazado","Sustituido"]).default("Cargado"),uploadedBy:t.z.string().default(""),notes:t.z.string().default("")}),l=t.z.object({scheduleId:i,activityId:t.z.string().min(1),reason:t.z.string().min(1),severity:t.z.enum(["low","medium","high","critical"]).default("medium"),responsible:t.z.string().default("")}),d=t.z.object({scheduleId:i,name:t.z.string().min(1),phase:t.z.enum(["engineering","procurement","infrastructure","cabling","commissioning","delivery","general"]).default("general"),targetDate:t.z.string().min(1),responsible:t.z.string().default(""),notes:t.z.string().default("")});e.s(["createBlockerSchema",0,l,"createEngineeringDocumentSchema",0,T,"createMilestoneSchema",0,d,"createScheduleSchema",0,r,"updateActivitySchema",0,o,"updateProcurementSchema",0,E,"updateScheduleSchema",0,n],19085)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__1vmecse._.js.map