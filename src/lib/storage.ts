import { mkdir, readFile, writeFile, unlink, stat } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getDocumentStorageProvider } from "@/lib/env";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DATABASE_STORAGE_PREFIX = "database:";
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

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

export function assertAllowedFileSignature(mimeType: string, bytes: Buffer) {
  if (mimeType === "application/pdf" && !hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46])) throw new Error("Uploaded PDF file signature is invalid.");
  if (mimeType === "image/jpeg" && !hasPrefix(bytes, [0xff, 0xd8, 0xff])) throw new Error("Uploaded JPEG file signature is invalid.");
  if (mimeType === "image/png" && !hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) throw new Error("Uploaded PNG file signature is invalid.");
  if (mimeType === "image/webp" && !(bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")) throw new Error("Uploaded WebP file signature is invalid.");
  if (mimeType === "application/msword" && !hasPrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0])) throw new Error("Uploaded DOC file signature is invalid.");
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && !hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04])) throw new Error("Uploaded DOCX file signature is invalid.");
  if (mimeType === "text/plain" && !looksLikePlainText(bytes)) throw new Error("Uploaded text file signature is invalid.");
}

async function saveBytes(bytes: Buffer, originalName: string, mimeType: string) {
  const fileName = `${Date.now()}-${randomUUID()}-${originalName}`;

  if (getDocumentStorageProvider() === "database") {
    const stored = await prisma.storedDocument.create({
      data: { fileName, originalName, mimeType, sizeBytes: bytes.length, bytes }
    });
    return { fileName, storagePath: `${DATABASE_STORAGE_PREFIX}${stored.key}` };
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
  if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error("Unsupported file type. Upload PDF, image, text, DOC, or DOCX files.");

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

  const filePath = await assertReadableStoredDocument(storagePath);
  return readFile(filePath);
}
