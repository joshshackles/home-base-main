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

assertContains("package.json", '"version": "4.61.5"');
assertContains("package.json", '"homepage-reference-fidelity-pass:verify": "tsx scripts/verify-homepage-reference-fidelity-pass.ts"');
assertContains("CHANGELOG.md", "## v4.61.5 - Version Consistency Metadata Cleanup");
assertExists("public/homebase-hero-building-slide.png");
assertContains("src/app/page.tsx", "homebase-hero-building-slide.png");
assertContains("src/app/page.tsx", "max-w-[1380px]");
assertContains("src/app/page.tsx", "-mt-12");
assertContains("src/app/page.tsx", "bg-[#061c3f]");
assertContains("src/components/home/HomepageHeroSlider.tsx", "min-h-[400px]");
assertContains("src/components/home/HomepageHeroSlider.tsx", "from-[#061c3f]");
assertContains("src/components/home/HomepageHeroSlider.tsx", "imagePosition");
assertContains("src/components/AppHeader.tsx", "h-[70px]");
assertContains("src/components/AppHeader.tsx", "Find a Property");
assertContains("src/components/brand/HomeBaseLogo.tsx", "fill={tone === \"light\" ? accent : \"#061c3f\"}");

console.log("Homepage reference fidelity pass verification passed.");
