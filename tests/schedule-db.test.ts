import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";

let dbAvailable = false;
let db: PrismaClient | null = null;

before(async () => {
  const tmpDir = path.join(process.cwd(), "tests", ".tmp");
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  const dbFile = path.join(tmpDir, "schedule-test.db");
  if (existsSync(dbFile)) {
    try {
      unlinkSync(dbFile);
    } catch {}
  }
  const url = `file:${dbFile.replace(/\\/g, "/")}`;

  try {
    db = new PrismaClient({ datasources: { db: { url } } });

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Estimate (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Sin nombre',
        clientName TEXT NOT NULL DEFAULT '',
        projectName TEXT NOT NULL DEFAULT '',
        currency TEXT NOT NULL DEFAULT 'MXN',
        revision TEXT NOT NULL DEFAULT 'Rev. 1',
        responsible TEXT NOT NULL DEFAULT '',
        projectManager TEXT NOT NULL DEFAULT '',
        startDate TEXT NOT NULL DEFAULT '',
        endDate TEXT NOT NULL DEFAULT '',
        techResponsable TEXT NOT NULL DEFAULT '',
        envResponsable TEXT NOT NULL DEFAULT '',
        riskResponsable TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        factorsNotes TEXT NOT NULL DEFAULT '',
        wasteFactorCable REAL NOT NULL DEFAULT 0.10,
        wasteFactorConduit REAL NOT NULL DEFAULT 0.15,
        verticalDrop REAL NOT NULL DEFAULT 3.0,
        rackAllowance REAL NOT NULL DEFAULT 5.0,
        indirectFactor REAL NOT NULL DEFAULT 0.12,
        ivaRate REAL NOT NULL DEFAULT 0.16,
        roundingPolicy INTEGER NOT NULL DEFAULT 2,
        laborTechnicianRate REAL NOT NULL DEFAULT 950.0,
        laborOfficerRate REAL NOT NULL DEFAULT 750.0,
        laborHelperRate REAL NOT NULL DEFAULT 500.0,
        useCrewBasedLabor BOOLEAN NOT NULL DEFAULT 0,
        cctvConfig TEXT NOT NULL DEFAULT '{}',
        accessConfig TEXT NOT NULL DEFAULT '{}',
        pagingConfig TEXT NOT NULL DEFAULT '{}',
        fireConfig TEXT NOT NULL DEFAULT '{}',
        floorplanConfig TEXT NOT NULL DEFAULT '{}',
        lineItems TEXT NOT NULL DEFAULT '[]',
        subtotalMaterials REAL NOT NULL DEFAULT 0,
        subtotalLabor REAL NOT NULL DEFAULT 0,
        subtotalEngineering REAL NOT NULL DEFAULT 0,
        subtotalDirect REAL NOT NULL DEFAULT 0,
        subtotalIndirects REAL NOT NULL DEFAULT 0,
        grandTotal REAL NOT NULL DEFAULT 0,
        iva REAL NOT NULL DEFAULT 0,
        totalWithIva REAL NOT NULL DEFAULT 0,
        hasManualEdits BOOLEAN NOT NULL DEFAULT 0,
        userId TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Schedule (
        id TEXT PRIMARY KEY,
        estimateId TEXT NOT NULL UNIQUE,
        startDate DATETIME,
        endDate DATETIME,
        engineeringStatus TEXT NOT NULL DEFAULT '',
        engineeringResponsible TEXT NOT NULL DEFAULT '',
        engineeringDueDate DATETIME,
        engineeringJustification TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ScheduleActivity (
        id TEXT PRIMARY KEY,
        scheduleId TEXT NOT NULL,
        name TEXT NOT NULL,
        system TEXT NOT NULL DEFAULT '',
        phase INTEGER NOT NULL DEFAULT 0,
        startDate DATETIME,
        endDate DATETIME,
        assigneeRole TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Pendiente',
        progress REAL NOT NULL DEFAULT 0,
        dependsOn TEXT NOT NULL DEFAULT '[]',
        risk TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ProcurementRecord (
        id TEXT PRIMARY KEY,
        scheduleId TEXT NOT NULL UNIQUE,
        comparativeRequestedAt DATETIME,
        comparativeMinExpectedAt DATETIME,
        comparativeReceivedAt DATETIME,
        supplierName TEXT NOT NULL DEFAULT '',
        quotedAmount REAL NOT NULL DEFAULT 0,
        deliveryLeadTimeDays INTEGER NOT NULL DEFAULT 0,
        paymentTerms TEXT NOT NULL DEFAULT '',
        advancePercent REAL NOT NULL DEFAULT 0,
        requisitionNumber TEXT NOT NULL DEFAULT '',
        purchaseOrderNumber TEXT NOT NULL DEFAULT '',
        advanceReleasedAt DATETIME,
        supplierPurchaseStartedAt DATETIME,
        materialsReceivedAt DATETIME,
        releasedForInstallationAt DATETIME,
        status TEXT NOT NULL DEFAULT 'Pendiente',
        notes TEXT NOT NULL DEFAULT '',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ScheduleMilestone (
        id TEXT PRIMARY KEY,
        scheduleId TEXT NOT NULL,
        name TEXT NOT NULL,
        phase TEXT NOT NULL DEFAULT 'general',
        targetDate DATETIME,
        completedAt DATETIME,
        status TEXT NOT NULL DEFAULT 'pending',
        responsible TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ScheduleBlocker (
        id TEXT PRIMARY KEY,
        scheduleId TEXT NOT NULL,
        activityId TEXT NOT NULL DEFAULT '',
        reason TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'medium',
        responsible TEXT NOT NULL DEFAULT '',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        releasedAt DATETIME,
        releaseNote TEXT NOT NULL DEFAULT ''
      );
    `);

    await db.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    if (db) {
      try {
        await db.$disconnect();
      } catch {}
    }
    db = null;
    dbAvailable = false;
  }
});

after(async () => {
  if (db) {
    await db.$disconnect();
  }
});

describe("Schedule (integración con SQLite)", () => {
  it("crea un Schedule con actividades y procurement", async (t) => {
    if (!dbAvailable || !db) {
      t.skip();
      return;
    }

    const estimate = await db.estimate.create({
      data: {
        name: "Estimate test",
        lineItems: "[]",
      },
    });

    const schedule = await db.schedule.create({
      data: {
        estimateId: estimate.id,
        procurement: { create: {} },
        activities: {
          create: [
            { name: "Infraestructura", phase: 3, system: "Infraestructura" },
            { name: "Cableado", phase: 4, system: "Cableado" },
          ],
        },
      },
      include: {
        activities: true,
        procurement: true,
      },
    });

    assert.strictEqual(schedule.estimateId, estimate.id);
    assert.strictEqual(schedule.activities.length, 2);
    assert.ok(schedule.procurement);
    assert.strictEqual(schedule.procurement?.scheduleId, schedule.id);
  });

  it("crea hitos y bloqueos asociados al schedule", async (t) => {
    if (!dbAvailable || !db) {
      t.skip();
      return;
    }

    const estimate = await db.estimate.create({
      data: { name: "Estimate blockers test", lineItems: "[]" },
    });

    const schedule = await db.schedule.create({
      data: { estimateId: estimate.id },
    });

    const activity = await db.scheduleActivity.create({
      data: {
        scheduleId: schedule.id,
        name: "Instalar cámaras",
        phase: 5,
        system: "CCTV",
      },
    });

    const milestone = await db.scheduleMilestone.create({
      data: {
        scheduleId: schedule.id,
        name: "Planos aprobados",
        phase: "engineering",
        targetDate: new Date("2026-01-15"),
        status: "pending",
      },
    });

    const blocker = await db.scheduleBlocker.create({
      data: {
        scheduleId: schedule.id,
        activityId: activity.id,
        reason: "Pendiente obra civil",
        severity: "high",
      },
    });

    assert.strictEqual(milestone.scheduleId, schedule.id);
    assert.strictEqual(milestone.status, "pending");
    assert.strictEqual(blocker.activityId, activity.id);
    assert.strictEqual(blocker.severity, "high");
    assert.ok(!blocker.releasedAt);

    // Release blocker
    const released = await db.scheduleBlocker.update({
      where: { id: blocker.id },
      data: { releasedAt: new Date(), releaseNote: "Obra civil terminada" },
    });
    assert.ok(released.releasedAt);

    // Complete milestone
    const completed = await db.scheduleMilestone.update({
      where: { id: milestone.id },
      data: { status: "completed", completedAt: new Date() },
    });
    assert.strictEqual(completed.status, "completed");
    assert.ok(completed.completedAt);
  });
});

