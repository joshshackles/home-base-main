import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function extractArray(source: string, name: string) {
  const match = source.match(new RegExp(`${name}\\s*[:=]\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) throw new Error(`Could not find ${name} array.`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

function assertIncludes(path: string, markers: string[]) {
  const source = read(path);
  const missing = markers.filter((marker) => !source.includes(marker));
  if (missing.length > 0) {
    throw new Error(`${path} is missing middleware static matcher markers:\n${missing.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

function assertExcludes(path: string, markers: string[]) {
  const source = read(path);
  const present = markers.filter((marker) => source.includes(marker));
  if (present.length > 0) {
    throw new Error(`${path} contains matcher patterns that are not build-safe:\n${present.map((marker) => `- ${marker}`).join("\n")}`);
  }
}

const manifest = read("src/lib/security/protected-routes.ts");
const middleware = read("src/middleware.ts");

const prefixes = extractArray(manifest, "PROTECTED_ROUTE_PREFIXES");
const manifestMatchers = extractArray(manifest, "PROTECTED_ROUTE_MATCHERS");
const middlewareMatchers = extractArray(middleware, "matcher");

const expectedMatchers = prefixes.map((prefix) => `${prefix}/:path*`);
const missingFromManifest = expectedMatchers.filter((matcher) => !manifestMatchers.includes(matcher));
const missingFromMiddleware = expectedMatchers.filter((matcher) => !middlewareMatchers.includes(matcher));
const extraMiddlewareMatchers = middlewareMatchers.filter((matcher) => !expectedMatchers.includes(matcher));

if (missingFromManifest.length > 0) {
  throw new Error(`Protected route manifest is missing matchers:\n${missingFromManifest.map((matcher) => `- ${matcher}`).join("\n")}`);
}

if (missingFromMiddleware.length > 0 || extraMiddlewareMatchers.length > 0) {
  throw new Error([
    "Middleware static matcher list is out of sync with PROTECTED_ROUTE_PREFIXES.",
    missingFromMiddleware.length ? `Missing:\n${missingFromMiddleware.map((matcher) => `- ${matcher}`).join("\n")}` : "",
    extraMiddlewareMatchers.length ? `Extra:\n${extraMiddlewareMatchers.map((matcher) => `- ${matcher}`).join("\n")}` : ""
  ].filter(Boolean).join("\n"));
}

assertIncludes("src/middleware.ts", [
  "Keep this literal for Next.js static matcher analysis",
  "PROTECTED_ROUTE_PREFIXES",
  "request.nextUrl.pathname.startsWith(prefix)",
  "matcher: ["
]);

assertExcludes("src/middleware.ts", [
  "matcher: PROTECTED_ROUTE_MATCHERS",
  "import { PROTECTED_ROUTE_MATCHERS"
]);

assertIncludes("package.json", [
  "\"version\": \"4.59.2\"",
  "\"middleware-static:verify\"",
  "\"protected-routes:verify\"",
  "\"environment-contract:verify\"",
  "\"expanded-access:verify\"",
  "\"vercel-build\": \"npm run vercel:preflight && npm run lockfile:verify && npm run clean-install:verify && npm run first-release:verify && npm run permission-matrix:verify && npm run authorization-runtime:verify && npm run protected-routes:verify && npm run middleware-static:verify && npm run environment-contract:verify && npm run expanded-access:verify"
]);

assertIncludes("src/lib/app-version.ts", ["4.59.2"]);
assertIncludes("README.md", ["Current package version: **4.59.2**"]);
assertIncludes("CHANGELOG.md", ["## v4.59.2 - Admin Command Center Null Date Fix"]);

console.log("Middleware static matcher verification passed.");
