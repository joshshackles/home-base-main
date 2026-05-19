-- HomeBase MLS v1.2.0 document request and checklist workflow.

CREATE TYPE "DocumentRequestStatus" AS ENUM ('REQUESTED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'WAIVED');

CREATE TABLE "DocumentRequest" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
  "status" "DocumentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "visibility" "DocumentVisibility" NOT NULL DEFAULT 'APPLICANT',
  "instructions" TEXT,
  "dueDate" TIMESTAMP(3),
  "requestedById" TEXT,
  "fulfilledDocumentId" TEXT,
  "reviewNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentRequest_applicationId_idx" ON "DocumentRequest"("applicationId");
CREATE INDEX "DocumentRequest_status_idx" ON "DocumentRequest"("status");
CREATE INDEX "DocumentRequest_category_idx" ON "DocumentRequest"("category");
CREATE INDEX "DocumentRequest_dueDate_idx" ON "DocumentRequest"("dueDate");
CREATE INDEX "DocumentRequest_fulfilledDocumentId_idx" ON "DocumentRequest"("fulfilledDocumentId");

ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_fulfilledDocumentId_fkey" FOREIGN KEY ("fulfilledDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
