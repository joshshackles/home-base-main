-- HomeBase MLS v1.9.0 inspection workflow

CREATE TYPE "InspectionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'NEEDS_REINSPECTION', 'CANCELLED');
CREATE TYPE "InspectionChecklistStatus" AS ENUM ('PENDING', 'PASS', 'FAIL', 'NA');

CREATE TABLE "Inspection" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "applicationId" TEXT,
  "assignedToId" TEXT,
  "status" "InspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledFor" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "inspectorName" TEXT,
  "resultSummary" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InspectionChecklistItem" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" "InspectionChecklistStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InspectionChecklistItem_pkey" PRIMARY KEY ("id")
);

ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'INSPECTION_SCHEDULED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'INSPECTION_COMPLETED';

CREATE INDEX "Inspection_unitId_idx" ON "Inspection"("unitId");
CREATE INDEX "Inspection_applicationId_idx" ON "Inspection"("applicationId");
CREATE INDEX "Inspection_assignedToId_idx" ON "Inspection"("assignedToId");
CREATE INDEX "Inspection_status_idx" ON "Inspection"("status");
CREATE INDEX "Inspection_scheduledFor_idx" ON "Inspection"("scheduledFor");
CREATE INDEX "InspectionChecklistItem_inspectionId_idx" ON "InspectionChecklistItem"("inspectionId");
CREATE INDEX "InspectionChecklistItem_status_idx" ON "InspectionChecklistItem"("status");
CREATE INDEX "InspectionChecklistItem_sortOrder_idx" ON "InspectionChecklistItem"("sortOrder");

ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InspectionChecklistItem" ADD CONSTRAINT "InspectionChecklistItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
