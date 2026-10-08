-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Consultor',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL DEFAULT '',
    "system" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pza',
    "unitCost" REAL NOT NULL DEFAULT 0,
    "performance" REAL NOT NULL DEFAULT 0,
    "deviceType" TEXT NOT NULL DEFAULT '',
    "provider" TEXT NOT NULL DEFAULT '',
    "certifications" TEXT NOT NULL DEFAULT '',
    "datasheetUrl" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "crewTechnician" REAL NOT NULL DEFAULT 0,
    "crewOfficer" REAL NOT NULL DEFAULT 0,
    "crewHelper" REAL NOT NULL DEFAULT 0,
    "laborHours" REAL NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
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

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'Sin nombre',
    "clientName" TEXT NOT NULL DEFAULT '',
    "projectName" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "revision" TEXT NOT NULL DEFAULT 'Rev. 1',
    "responsible" TEXT NOT NULL DEFAULT '',
    "projectManager" TEXT NOT NULL DEFAULT '',
    "projectManagerEmail" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "parametricDeliveryDate" TEXT NOT NULL DEFAULT '',
    "techResponsable" TEXT NOT NULL DEFAULT '',
    "techResponsableEmail" TEXT NOT NULL DEFAULT '',
    "envResponsable" TEXT NOT NULL DEFAULT '',
    "envResponsableEmail" TEXT NOT NULL DEFAULT '',
    "riskResponsable" TEXT NOT NULL DEFAULT '',
    "riskResponsableEmail" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "factorsNotes" TEXT NOT NULL DEFAULT '',
    "wasteFactorCable" REAL NOT NULL DEFAULT 0.10,
    "wasteFactorConduit" REAL NOT NULL DEFAULT 0.15,
    "verticalDrop" REAL NOT NULL DEFAULT 3.0,
    "rackAllowance" REAL NOT NULL DEFAULT 5.0,
    "indirectFactor" REAL NOT NULL DEFAULT 0.12,
    "ivaRate" REAL NOT NULL DEFAULT 0.16,
    "roundingPolicy" INTEGER NOT NULL DEFAULT 2,
    "laborTechnicianRate" REAL NOT NULL DEFAULT 950.0,
    "laborOfficerRate" REAL NOT NULL DEFAULT 750.0,
    "laborHelperRate" REAL NOT NULL DEFAULT 500.0,
    "useCrewBasedLabor" BOOLEAN NOT NULL DEFAULT false,
    "cctvConfig" TEXT NOT NULL DEFAULT '{}',
    "accessConfig" TEXT NOT NULL DEFAULT '{}',
    "pagingConfig" TEXT NOT NULL DEFAULT '{}',
    "fireConfig" TEXT NOT NULL DEFAULT '{}',
    "floorplanConfig" TEXT NOT NULL DEFAULT '{}',
    "lineItems" TEXT NOT NULL DEFAULT '[]',
    "subtotalMaterials" REAL NOT NULL DEFAULT 0,
    "subtotalLabor" REAL NOT NULL DEFAULT 0,
    "subtotalEngineering" REAL NOT NULL DEFAULT 0,
    "subtotalDirect" REAL NOT NULL DEFAULT 0,
    "subtotalIndirects" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL DEFAULT 0,
    "iva" REAL NOT NULL DEFAULT 0,
    "totalWithIva" REAL NOT NULL DEFAULT 0,
    "hasManualEdits" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Estimate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstimateHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estimateId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "user" TEXT NOT NULL DEFAULT 'Sistema / Usuario',
    "details" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimateHistory_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estimateId" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "engineeringStatus" TEXT NOT NULL DEFAULT '',
    "engineeringResponsible" TEXT NOT NULL DEFAULT '',
    "engineeringDueDate" DATETIME,
    "engineeringJustification" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Schedule_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "system" TEXT NOT NULL DEFAULT '',
    "phase" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "assigneeRole" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Pendiente',
    "progress" REAL NOT NULL DEFAULT 0,
    "dependsOn" TEXT NOT NULL DEFAULT '[]',
    "risk" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduleActivity_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'general',
    "targetDate" DATETIME,
    "completedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "responsible" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduleMilestone_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleBlocker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "responsible" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" DATETIME,
    "releaseNote" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "ScheduleBlocker_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EngineeringDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "system" TEXT NOT NULL DEFAULT '',
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "revision" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Cargado',
    "uploadedBy" TEXT NOT NULL DEFAULT '',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "EngineeringDocument_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcurementRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "comparativeRequestedAt" DATETIME,
    "comparativeMinExpectedAt" DATETIME,
    "comparativeReceivedAt" DATETIME,
    "supplierName" TEXT NOT NULL DEFAULT '',
    "quotedAmount" REAL NOT NULL DEFAULT 0,
    "deliveryLeadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "paymentTerms" TEXT NOT NULL DEFAULT '',
    "advancePercent" REAL NOT NULL DEFAULT 0,
    "requisitionNumber" TEXT NOT NULL DEFAULT '',
    "purchaseOrderNumber" TEXT NOT NULL DEFAULT '',
    "advanceReleasedAt" DATETIME,
    "supplierPurchaseStartedAt" DATETIME,
    "materialsReceivedAt" DATETIME,
    "releasedForInstallationAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Pendiente',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProcurementRecord_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userRole" TEXT NOT NULL DEFAULT '',
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "PriceItem_userId_idx" ON "PriceItem"("userId");

-- CreateIndex
CREATE INDEX "PriceItem_system_idx" ON "PriceItem"("system");

-- CreateIndex
CREATE INDEX "PriceItem_category_idx" ON "PriceItem"("category");

-- CreateIndex
CREATE INDEX "PriceItem_sku_idx" ON "PriceItem"("sku");

-- CreateIndex
CREATE INDEX "PriceItem_active_idx" ON "PriceItem"("active");

-- CreateIndex
CREATE INDEX "PriceItem_system_active_idx" ON "PriceItem"("system", "active");

-- CreateIndex
CREATE INDEX "PriceHistory_priceItemId_idx" ON "PriceHistory"("priceItemId");

-- CreateIndex
CREATE INDEX "PriceHistory_createdAt_idx" ON "PriceHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Estimate_userId_idx" ON "Estimate"("userId");

-- CreateIndex
CREATE INDEX "Estimate_updatedAt_idx" ON "Estimate"("updatedAt");

-- CreateIndex
CREATE INDEX "EstimateHistory_estimateId_idx" ON "EstimateHistory"("estimateId");

-- CreateIndex
CREATE INDEX "EstimateHistory_createdAt_idx" ON "EstimateHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_estimateId_key" ON "Schedule"("estimateId");

-- CreateIndex
CREATE INDEX "Schedule_estimateId_idx" ON "Schedule"("estimateId");

-- CreateIndex
CREATE INDEX "ScheduleActivity_scheduleId_idx" ON "ScheduleActivity"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduleActivity_system_idx" ON "ScheduleActivity"("system");

-- CreateIndex
CREATE INDEX "ScheduleActivity_phase_idx" ON "ScheduleActivity"("phase");

-- CreateIndex
CREATE INDEX "ScheduleActivity_status_idx" ON "ScheduleActivity"("status");

-- CreateIndex
CREATE INDEX "ScheduleMilestone_scheduleId_idx" ON "ScheduleMilestone"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduleMilestone_status_idx" ON "ScheduleMilestone"("status");

-- CreateIndex
CREATE INDEX "ScheduleBlocker_scheduleId_idx" ON "ScheduleBlocker"("scheduleId");

-- CreateIndex
CREATE INDEX "EngineeringDocument_scheduleId_idx" ON "EngineeringDocument"("scheduleId");

-- CreateIndex
CREATE INDEX "EngineeringDocument_system_idx" ON "EngineeringDocument"("system");

-- CreateIndex
CREATE INDEX "EngineeringDocument_status_idx" ON "EngineeringDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementRecord_scheduleId_key" ON "ProcurementRecord"("scheduleId");

-- CreateIndex
CREATE INDEX "ProcurementRecord_status_idx" ON "ProcurementRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_type_value_key" ON "CustomField"("type", "value");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_result_idx" ON "AuditLog"("result");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
