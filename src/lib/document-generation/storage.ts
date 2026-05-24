import { readStoredDocument, removeStoredDocument, saveGeneratedDocument } from "@/lib/storage";

export async function saveGeneratedDocumentFile(buffer: Buffer, fileName: string, mimeType: string) {
  return saveGeneratedDocument(buffer, fileName, mimeType);
}

export async function getGeneratedDocumentFile(storagePath: string) {
  return readStoredDocument(storagePath);
}

export async function deleteGeneratedDocumentFile(storagePath: string) {
  return removeStoredDocument(storagePath);
}
