const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
const skip = process.env.SKIP_POSTINSTALL === "1" || process.env.CI === "true" || isVercel;

if (skip) {
  console.log("Skipping postinstall side effects; Prisma generation runs during build.");
  process.exit(0);
}

const { spawnSync } = await import("node:child_process");
const result = spawnSync("npx", ["prisma", "generate"], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
