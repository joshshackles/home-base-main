-- Marketplace Search v2: saved searches and listing availability.
ALTER TABLE "Unit" ADD COLUMN "availableOn" TIMESTAMP(3);

CREATE TABLE "SavedMarketplaceSearch" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "query" TEXT,
  "filters" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SavedMarketplaceSearch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SavedMarketplaceSearch_userId_idx" ON "SavedMarketplaceSearch"("userId");
CREATE INDEX "SavedMarketplaceSearch_createdAt_idx" ON "SavedMarketplaceSearch"("createdAt");

ALTER TABLE "SavedMarketplaceSearch"
  ADD CONSTRAINT "SavedMarketplaceSearch_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
