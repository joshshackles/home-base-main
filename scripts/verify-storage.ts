import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { ServerSideEncryption } from "@aws-sdk/client-s3";

const uploadDir = path.resolve(process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), "storage", "documents"));
const projectRoot = path.resolve(process.cwd());
const tempFile = path.join(uploadDir, `.homebase-storage-smoke-${Date.now()}.txt`);
const provider = (process.env.DOCUMENT_STORAGE_PROVIDER || (process.env.NODE_ENV === "production" ? "database" : "local")).toLowerCase();

function getServerSideEncryption(): ServerSideEncryption | undefined {
  const value = process.env.DOCUMENT_S3_SERVER_SIDE_ENCRYPTION;
  if (!value) return undefined;

  if (value === "AES256" || value === "aws:kms" || value === "aws:kms:dsse") {
    return value;
  }

  throw new Error("DOCUMENT_S3_SERVER_SIDE_ENCRYPTION must be AES256, aws:kms, or aws:kms:dsse.");
}

async function verifyS3Storage() {
  const required = ["DOCUMENT_S3_BUCKET", "DOCUMENT_S3_REGION", "DOCUMENT_S3_ACCESS_KEY_ID", "DOCUMENT_S3_SECRET_ACCESS_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required object storage env vars: ${missing.join(", ")}`);
  }

  const client = new S3Client({
    region: process.env.DOCUMENT_S3_REGION,
    endpoint: process.env.DOCUMENT_S3_ENDPOINT || undefined,
    forcePathStyle: process.env.DOCUMENT_S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.DOCUMENT_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.DOCUMENT_S3_SECRET_ACCESS_KEY!
    }
  });

  const prefix = (process.env.DOCUMENT_S3_PREFIX || "documents").replace(/^\/+|\/+$/g, "");
  const key = `${prefix ? `${prefix}/` : ""}.homebase-storage-smoke-${Date.now()}.txt`;
  const body = "homebase-storage-smoke-test";

  await client.send(new PutObjectCommand({
    Bucket: process.env.DOCUMENT_S3_BUCKET!,
    Key: key,
    Body: body,
    ContentType: "text/plain",
    ServerSideEncryption: getServerSideEncryption()
  }));

  const readback = await client.send(new GetObjectCommand({
    Bucket: process.env.DOCUMENT_S3_BUCKET!,
    Key: key
  }));

  const bytes = await readback.Body?.transformToByteArray();
  if (!bytes || Buffer.from(bytes).toString("utf8") !== body) {
    throw new Error("Object storage smoke test readback did not match written content.");
  }

  await client.send(new DeleteObjectCommand({
    Bucket: process.env.DOCUMENT_S3_BUCKET!,
    Key: key
  }));

  console.log(`Storage verification passed: object storage bucket ${process.env.DOCUMENT_S3_BUCKET}.`);
}

async function main() {
  if (provider === "database") {
    console.log("Storage verification passed: database provider selected for durable document storage.");
    return;
  }

  if (provider === "s3") {
    await verifyS3Storage();
    return;
  }

  if (provider !== "local") {
    console.error("Storage verification failed: DOCUMENT_STORAGE_PROVIDER must be database, local, or s3.");
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
}

main().catch((error) => {
  console.error("Storage verification failed.");
  console.error(error);
  process.exit(1);
});
