DO $$ BEGIN
  CREATE TYPE "LeaseTemplateKind" AS ENUM ('RESIDENTIAL', 'RENEWAL', 'ADDENDUM', 'NOTICE', 'COMMERCIAL', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "LeaseTemplate" ADD COLUMN IF NOT EXISTS "kind" "LeaseTemplateKind" NOT NULL DEFAULT 'RESIDENTIAL';
ALTER TABLE "LeaseTemplate" ADD COLUMN IF NOT EXISTS "jurisdictionState" TEXT;
ALTER TABLE "LeaseTemplate" ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT;
ALTER TABLE "LeaseTemplate" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LeaseTemplate" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "LeaseTemplate" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3);

ALTER TABLE "LeaseTemplate" DROP CONSTRAINT IF EXISTS "LeaseTemplate_name_key";

DO $$ BEGIN
  ALTER TABLE "LeaseTemplate" ADD CONSTRAINT "LeaseTemplate_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "LeaseTemplate_ownerUserId_name_key" ON "LeaseTemplate"("ownerUserId", "name");
CREATE INDEX IF NOT EXISTS "LeaseTemplate_ownerUserId_isActive_idx" ON "LeaseTemplate"("ownerUserId", "isActive");
CREATE INDEX IF NOT EXISTS "LeaseTemplate_kind_isActive_idx" ON "LeaseTemplate"("kind", "isActive");
CREATE INDEX IF NOT EXISTS "LeaseTemplate_jurisdictionState_idx" ON "LeaseTemplate"("jurisdictionState");

CREATE TABLE IF NOT EXISTS "LeaseTemplateClause" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaseTemplateClause_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "LeaseTemplateClause" ADD CONSTRAINT "LeaseTemplateClause_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LeaseTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "LeaseTemplateClause_templateId_sortOrder_idx" ON "LeaseTemplateClause"("templateId", "sortOrder");
