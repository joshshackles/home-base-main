-- Make profile connection uniqueness reliable for portfolio-level rows.
-- PostgreSQL unique indexes treat NULL values as distinct, so the previous
-- unique constraint could still allow duplicate portfolio-level connections.
ALTER TABLE "ProfileConnection" ADD COLUMN IF NOT EXISTS "scopeKey" TEXT NOT NULL DEFAULT 'PORTFOLIO';

UPDATE "ProfileConnection"
SET "scopeKey" = COALESCE("unitId", 'PORTFOLIO')
WHERE "scopeKey" IS NULL OR "scopeKey" = 'PORTFOLIO';

-- Keep the most useful row if earlier builds created duplicates before the
-- reliable scopeKey unique index existed.
WITH ranked_connections AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "landlordUserId", "targetUserId", "scopeKey", "assignedRole"
      ORDER BY
        CASE "status" WHEN 'ACTIVE' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,
        "updatedAt" DESC,
        "createdAt" DESC
    ) AS row_number
  FROM "ProfileConnection"
)
DELETE FROM "ProfileConnection"
USING ranked_connections
WHERE "ProfileConnection"."id" = ranked_connections."id"
  AND ranked_connections.row_number > 1;

DROP INDEX IF EXISTS "ProfileConnection_landlordUserId_targetUserId_unitId_assignedRole_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ProfileConnection_landlordUserId_targetUserId_scopeKey_assignedRole_key"
  ON "ProfileConnection"("landlordUserId", "targetUserId", "scopeKey", "assignedRole");
CREATE INDEX IF NOT EXISTS "ProfileConnection_scopeKey_idx" ON "ProfileConnection"("scopeKey");
