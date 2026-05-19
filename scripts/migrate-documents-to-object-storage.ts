import { prisma } from "@/lib/prisma";
import { readStoredDocument, removeStoredDocument, saveGeneratedDocument } from "@/lib/storage";
import { getDocumentStorageProvider } from "@/lib/env";

async function main() {
  const provider = getDocumentStorageProvider();

  if (provider !== "s3") {
    throw new Error("Set DOCUMENT_STORAGE_PROVIDER=s3 before running this migration.");
  }

  const documents = await prisma.document.findMany({
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      storagePath: true
    },
    orderBy: { createdAt: "asc" }
  });

  let migrated = 0;
  let skipped = 0;

  for (const document of documents) {
    if (document.storagePath.startsWith("s3:")) {
      skipped++;
      continue;
    }

    const previousPath = document.storagePath;
    const bytes = await readStoredDocument(previousPath);
    const stored = await saveGeneratedDocument(bytes, document.originalName, document.mimeType);

    await prisma.document.update({
      where: { id: document.id },
      data: { storagePath: stored.storagePath, fileName: stored.fileName }
    });

    await removeStoredDocument(previousPath);
    migrated++;
    console.log(`Migrated document ${document.id} to object storage.`);
  }

  console.log(`Object storage migration complete. Migrated: ${migrated}. Skipped: ${skipped}.`);
}

main()
  .catch((error) => {
    console.error("Object storage migration failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
