-- v2.6.10 durable document storage
-- Stores private document bytes in Neon when DOCUMENT_STORAGE_PROVIDER=database.

CREATE TABLE "StoredDocument" (
  "key" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "bytes" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StoredDocument_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "StoredDocument_createdAt_idx" ON "StoredDocument"("createdAt");
