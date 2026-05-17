import { mkdir, writeFile, unlink, stat } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
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

export async function saveUploadedDocument(file: File) {
  if (!file || file.size === 0) throw new Error("A document file is required.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Documents must be 10 MB or smaller.");
  if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error("Unsupported file type. Upload PDF, image, text, DOC, or DOCX files.");

  const root = getUploadRoot();
  await mkdir(root, { recursive: true });

  const originalName = cleanFileName(file.name || "document");
  const fileName = `${Date.now()}-${randomUUID()}-${originalName}`;
  const storagePath = path.join(root, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, bytes);

  return {
    fileName,
    originalName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    storagePath
  };
}

export async function saveGeneratedDocument(buffer: Buffer, originalName: string, mimeType = "application/pdf") {
  if (!buffer || buffer.length === 0) throw new Error("Generated document is empty.");

  const root = getUploadRoot();
  await mkdir(root, { recursive: true });

  const cleanOriginalName = cleanFileName(originalName || "generated-document.pdf");
  const fileName = `${Date.now()}-${randomUUID()}-${cleanOriginalName}`;
  const storagePath = path.join(root, fileName);
  await writeFile(storagePath, buffer);

  return {
    fileName,
    originalName: cleanOriginalName,
    mimeType,
    sizeBytes: buffer.length,
    storagePath
  };
}

export async function removeStoredDocument(storagePath: string) {
  try {
    await unlink(storagePath);
  } catch {
    // Ignore missing local files so document records can still be removed.
  }
}

export async function assertReadableStoredDocument(storagePath: string) {
  const root = path.resolve(getUploadRoot());
  const resolved = path.resolve(storagePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error("Invalid document storage path.");
  const info = await stat(resolved);
  if (!info.isFile()) throw new Error("Document file was not found.");
  return resolved;
}
