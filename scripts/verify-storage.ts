import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";

const uploadDir = path.resolve(process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), "storage", "documents"));
const projectRoot = path.resolve(process.cwd());
const tempFile = path.join(uploadDir, `.homebase-storage-smoke-${Date.now()}.txt`);
const provider = (process.env.DOCUMENT_STORAGE_PROVIDER || (process.env.NODE_ENV === "production" ? "database" : "local")).toLowerCase();

if (provider === "database") {
  console.log("Storage verification passed: database provider selected for durable document storage.");
  process.exit(0);
}

if (provider !== "local") {
  console.error("Storage verification failed: DOCUMENT_STORAGE_PROVIDER must be database or local.");
  process.exit(1);
}

if (uploadDir === projectRoot || uploadDir === path.parse(projectRoot).root) {
  console.error(`Refusing to use unsafe upload directory for smoke test: ${uploadDir}`);
  process.exit(1);
}

try {
  mkdirSync(uploadDir, { recursive: true });
  writeFileSync(tempFile, "homebase-storage-smoke-test", "utf8");
  const contents = readFileSync(tempFile, "utf8");
  if (contents !== "homebase-storage-smoke-test") {
    throw new Error("Storage smoke test readback did not match written content.");
  }
  rmSync(tempFile, { force: true });
  if (existsSync(tempFile)) {
    throw new Error("Storage smoke test temp file was not removed.");
  }
  console.log(`Storage verification passed: ${uploadDir}`);
} catch (error) {
  console.error("Storage verification failed.");
  console.error(error);
  try {
    rmSync(tempFile, { force: true });
  } catch {}
  process.exit(1);
}
