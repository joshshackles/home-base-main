import { mkdir, readFile, writeFile, unlink, stat } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getDocumentStorageProvider } from "@/lib/env";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DATABASE_STORAGE_PREFIX = "database:";
const OBJECT_STORAGE_PREFIX = "s3:";
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/plain",
  "text/csv",
  "application/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);

let s3Client: S3Client | null = null;

export function getUploadRoot() {
  return process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), "storage", "documents");
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "document";
}

function hasPrefix(bytes: Buffer, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function looksLikePlainText(bytes: Buffer) {
  return !bytes.includes(0);
}

function getObjectStorageBucket() {
  const bucket = process.env.DOCUMENT_S3_BUCKET;
  if (!bucket) throw new Error("DOCUMENT_S3_BUCKET is required when DOCUMENT_STORAGE_PROVIDER=s3.");
  return bucket;
}

function getObjectStoragePrefix() {
  return (process.env.DOCUMENT_S3_PREFIX || "documents").replace(/^\/+|\/+$/g, "");
}

function getObjectStorageClient() {
  if (s3Client) return s3Client;

  const region = process.env.DOCUMENT_S3_REGION;
  const accessKeyId = process.env.DOCUMENT_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.DOCUMENT_S3_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("DOCUMENT_S3_REGION, DOCUMENT_S3_ACCESS_KEY_ID, and DOCUMENT_S3_SECRET_ACCESS_KEY are required when DOCUMENT_STORAGE_PROVIDER=s3.");
  }

  s3Client = new S3Client({
    region,
    endpoint: process.env.DOCUMENT_S3_ENDPOINT || undefined,
    forcePathStyle: process.env.DOCUMENT_S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  return s3Client;
}

function getObjectKey(fileName: string) {
  const prefix = getObjectStoragePrefix();
  return prefix ? `${prefix}/${fileName}` : fileName;
}

async function streamToBuffer(body: unknown) {
  if (!body || typeof (body as { transformToByteArray?: unknown }).transformToByteArray !== "function") {
    throw new Error("Object storage response body was empty or unreadable.");
  }

  const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  return Buffer.from(bytes);
}

export function assertAllowedFileSignature(mimeType: string, bytes: Buffer) {
  if (mimeType === "application/pdf" && !hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46])) throw new Error("Uploaded PDF file signature is invalid.");
  if (mimeType === "image/jpeg" && !hasPrefix(bytes, [0xff, 0xd8, 0xff])) throw new Error("Uploaded JPEG file signature is invalid.");
  if (mimeType === "image/png" && !hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) throw new Error("Uploaded PNG file signature is invalid.");
  if (mimeType === "image/webp" && !(bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")) throw new Error("Uploaded WebP file signature is invalid.");
  if ((mimeType === "image/heic" || mimeType === "image/heif") && !bytes.toString("ascii", 4, 12).startsWith("ftyp")) throw new Error("Uploaded HEIC/HEIF file signature is invalid.");
  if (mimeType === "application/msword" && !hasPrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0])) throw new Error("Uploaded DOC file signature is invalid.");
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && !hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04])) throw new Error("Uploaded DOCX file signature is invalid.");
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && !hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04])) throw new Error("Uploaded XLSX file signature is invalid.");
  if ((mimeType === "text/plain" || mimeType === "text/csv" || mimeType === "application/csv") && !looksLikePlainText(bytes)) throw new Error("Uploaded text/CSV file signature is invalid.");
}

async function saveBytes(bytes: Buffer, originalName: string, mimeType: string) {
  const fileName = `${Date.now()}-${randomUUID()}-${originalName}`;
  const provider = getDocumentStorageProvider();

  if (provider === "database") {
    const stored = await prisma.storedDocument.create({
      data: { fileName, originalName, mimeType, sizeBytes: bytes.length, bytes }
    });
    return { fileName, storagePath: `${DATABASE_STORAGE_PREFIX}${stored.key}` };
  }

  if (provider === "s3") {
    const key = getObjectKey(fileName);
    await getObjectStorageClient().send(new PutObjectCommand({
      Bucket: getObjectStorageBucket(),
      Key: key,
      Body: bytes,
      ContentType: mimeType,
      Metadata: {
        originalName
      },
      ServerSideEncryption: process.env.DOCUMENT_S3_SERVER_SIDE_ENCRYPTION || undefined
    }));
    return { fileName, storagePath: `${OBJECT_STORAGE_PREFIX}${key}` };
  }

  const root = getUploadRoot();
  await mkdir(root, { recursive: true });
  const storagePath = path.join(root, fileName);
  await writeFile(storagePath, bytes);
  return { fileName, storagePath };
}

export async function saveUploadedDocument(file: File) {
  if (!file || file.size === 0) throw new Error("A document file is required.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Documents must be 10 MB or smaller.");
  if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error("Unsupported file type. Upload PDF, image, HEIC/HEIF, text, CSV, DOC, DOCX, or XLSX files.");

  const originalName = cleanFileName(file.name || "document");
  const bytes = Buffer.from(await file.arrayBuffer());
  assertAllowedFileSignature(file.type, bytes);
  const stored = await saveBytes(bytes, originalName, file.type || "application/octet-stream");

  return {
    fileName: stored.fileName,
    originalName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    storagePath: stored.storagePath
  };
}

export async function saveGeneratedDocument(buffer: Buffer, originalName: string, mimeType = "application/pdf") {
  if (!buffer || buffer.length === 0) throw new Error("Generated document is empty.");

  const cleanOriginalName = cleanFileName(originalName || "generated-document.pdf");
  const stored = await saveBytes(buffer, cleanOriginalName, mimeType);

  return {
    fileName: stored.fileName,
    originalName: cleanOriginalName,
    mimeType,
    sizeBytes: buffer.length,
    storagePath: stored.storagePath
  };
}

export async function removeStoredDocument(storagePath: string) {
  if (storagePath.startsWith(DATABASE_STORAGE_PREFIX)) {
    await prisma.storedDocument.deleteMany({ where: { key: storagePath.slice(DATABASE_STORAGE_PREFIX.length) } });
    return;
  }

  if (storagePath.startsWith(OBJECT_STORAGE_PREFIX)) {
    await getObjectStorageClient().send(new DeleteObjectCommand({
      Bucket: getObjectStorageBucket(),
      Key: storagePath.slice(OBJECT_STORAGE_PREFIX.length)
    }));
    return;
  }

  try {
    await unlink(storagePath);
  } catch {
    // Ignore missing local files so document records can still be removed.
  }
}

export async function assertReadableStoredDocument(storagePath: string) {
  if (storagePath.startsWith(DATABASE_STORAGE_PREFIX)) {
    const stored = await prisma.storedDocument.findUnique({ where: { key: storagePath.slice(DATABASE_STORAGE_PREFIX.length) }, select: { key: true } });
    if (!stored) throw new Error("Document file was not found.");
    return storagePath;
  }

  if (storagePath.startsWith(OBJECT_STORAGE_PREFIX)) {
    await getObjectStorageClient().send(new HeadObjectCommand({
      Bucket: getObjectStorageBucket(),
      Key: storagePath.slice(OBJECT_STORAGE_PREFIX.length)
    }));
    return storagePath;
  }

  const root = path.resolve(getUploadRoot());
  const resolved = path.resolve(storagePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error("Invalid document storage path.");
  const info = await stat(resolved);
  if (!info.isFile()) throw new Error("Document file was not found.");
  return resolved;
}

export async function readStoredDocument(storagePath: string) {
  if (storagePath.startsWith(DATABASE_STORAGE_PREFIX)) {
    const stored = await prisma.storedDocument.findUnique({ where: { key: storagePath.slice(DATABASE_STORAGE_PREFIX.length) }, select: { bytes: true } });
    if (!stored) throw new Error("Document file was not found.");
    return Buffer.from(stored.bytes);
  }

  if (storagePath.startsWith(OBJECT_STORAGE_PREFIX)) {
    const response = await getObjectStorageClient().send(new GetObjectCommand({
      Bucket: getObjectStorageBucket(),
      Key: storagePath.slice(OBJECT_STORAGE_PREFIX.length)
    }));
    return streamToBuffer(response.Body);
  }

  const filePath = await assertReadableStoredDocument(storagePath);
  return readFile(filePath);
}
