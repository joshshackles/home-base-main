CREATE TABLE "HomepageHeroSlide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Search Rentals',
    "ctaHref" TEXT NOT NULL DEFAULT '/marketplace',
    "secondaryLabel" TEXT,
    "secondaryHref" TEXT,
    "imageAlt" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageHeroSlide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomepageHeroSlide_isActive_sortOrder_idx" ON "HomepageHeroSlide"("isActive", "sortOrder");
CREATE INDEX "HomepageHeroSlide_createdAt_idx" ON "HomepageHeroSlide"("createdAt");
CREATE INDEX "HomepageHeroSlide_createdById_idx" ON "HomepageHeroSlide"("createdById");
