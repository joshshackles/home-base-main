import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assertExists(path: string) {
  if (!existsSync(join(root, path))) throw new Error(`${path} is missing.`);
}

function assertContains(path: string, marker: string) {
  const source = read(path);
  if (!source.includes(marker)) throw new Error(`${path} is missing ${marker}`);
}

assertContains("package.json", '"version": "4.61.2"');
assertContains("package.json", '"homepage-slider-marketplace-refresh:verify": "tsx scripts/verify-homepage-slider-marketplace-refresh.ts"');
assertContains("CHANGELOG.md", "## v4.61.2 - Admin Branding Slide Search Param Fix");
assertContains("src/lib/app-version.ts", "4.61.2");
assertContains("README.md", "Current package version: **4.61.2**");

assertContains("prisma/schema.prisma", "model HomepageHeroSlide");
assertContains("prisma/schema.prisma", "@@index([isActive, sortOrder])");
assertExists("prisma/migrations/20260520140000_homepage_hero_slider/migration.sql");
assertContains("prisma/migrations/20260520140000_homepage_hero_slider/migration.sql", 'CREATE TABLE "HomepageHeroSlide"');

assertExists("public/homebase-hero-reference.png");
assertContains("src/components/home/HomepageHeroSlider.tsx", "HomepageHeroSlider");
assertContains("src/components/home/HomepageHeroSlider.tsx", "setInterval");
assertContains("src/components/home/HomepageHeroSlider.tsx", "Pause homepage image slider");
assertContains("src/app/api/homepage-slides/[id]/route.ts", "readStoredDocument");
assertContains("src/app/api/homepage-slides/[id]/route.ts", "homepageHeroSlide.findUnique");

assertContains("src/app/page.tsx", "Find Your Next Home. Simplified.");
assertContains("src/app/page.tsx", "HomepageHeroSlider");
assertContains("src/app/page.tsx", "SearchPanel");
assertContains("src/app/page.tsx", "Featured Rentals");
assertContains("src/app/page.tsx", "homebase-hero-reference.png");
assertContains("src/app/page.tsx", "prisma.homepageHeroSlide.findMany");

assertContains("src/app/admin/actions.ts", "uploadHomepageHeroSlideAction");
assertContains("src/app/admin/actions.ts", "updateHomepageHeroSlideAction");
assertContains("src/app/admin/actions.ts", "deleteHomepageHeroSlideAction");
assertContains("src/app/admin/actions.ts", "HomepageHeroSlide");
assertContains("src/app/admin/branding/page.tsx", "Homepage image slider");
assertContains("src/app/admin/branding/page.tsx", "uploadHomepageHeroSlideAction");
assertContains("src/app/admin/branding/page.tsx", "/api/homepage-slides/");
assertContains("src/lib/navigation/first-release.ts", 'href: "/admin/branding"');
assertContains("src/components/AppHeader.tsx", "Find a Property");
assertContains("src/components/brand/HomeBaseLogo.tsx", ">MLS<");

console.log("Homepage slider marketplace refresh verification passed.");
