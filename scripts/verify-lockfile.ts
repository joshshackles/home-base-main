import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  name?: string;
  version?: string;
  packageManager?: string;
  engines?: { node?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const lockfileText = readFileSync("package-lock.json", "utf8");
const lockfile = JSON.parse(lockfileText) as {
  name?: string;
  version?: string;
  lockfileVersion?: number;
  packages?: Record<string, { name?: string; version?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string>; resolved?: string }>;
};

function fail(message: string): never {
  throw new Error(`Lockfile verification failed: ${message}`);
}

if (lockfile.name !== packageJson.name) fail(`lockfile name ${lockfile.name ?? "missing"} does not match package name ${packageJson.name ?? "missing"}`);
if (lockfile.version !== packageJson.version) fail(`lockfile version ${lockfile.version ?? "missing"} does not match package version ${packageJson.version ?? "missing"}`);
if (lockfile.lockfileVersion !== 3) fail(`expected npm lockfileVersion 3, found ${lockfile.lockfileVersion ?? "missing"}`);
if (packageJson.packageManager !== "npm@10.9.0") fail("packageManager must pin npm@10.9.0 for Vercel-compatible installs");
if (packageJson.engines?.node !== "20.x") fail("engines.node must be 20.x for Vercel-compatible Next.js builds");

const rootPackage = lockfile.packages?.[""];
if (!rootPackage) fail("lockfile is missing the root package entry");
if (rootPackage.name !== packageJson.name) fail("lockfile root package name does not match package.json");
if (rootPackage.version !== packageJson.version) fail("lockfile root package version does not match package.json");

const dependencyGroups = [
  ["dependencies", packageJson.dependencies ?? {}, rootPackage.dependencies ?? {}],
  ["devDependencies", packageJson.devDependencies ?? {}, rootPackage.devDependencies ?? {}]
] as const;

for (const [label, expected, actual] of dependencyGroups) {
  for (const [name, version] of Object.entries(expected)) {
    if (actual[name] !== version) fail(`root lockfile ${label}.${name}=${actual[name] ?? "missing"} does not match package.json ${version}`);
  }
}

const forbiddenPatterns = [
  "packages.applied-caas-gateway1.internal.api.openai.org",
  "artifactory/api/npm",
  "localhost",
  "127.0.0.1"
];

for (const pattern of forbiddenPatterns) {
  if (lockfileText.includes(pattern)) fail(`package-lock.json contains non-public registry reference: ${pattern}`);
}

const badResolved = Object.entries(lockfile.packages ?? {})
  .filter(([, value]) => value.resolved && !value.resolved.startsWith("https://registry.npmjs.org/") && !value.resolved.startsWith("file:"));

if (badResolved.length > 0) {
  fail(`package-lock.json contains non-npm resolved URLs: ${badResolved.slice(0, 5).map(([name, value]) => `${name} -> ${value.resolved}`).join(", ")}`);
}

console.log("Lockfile verification passed: npm registry URLs, root metadata, package manager, and dependency pins are Vercel-ready.");
