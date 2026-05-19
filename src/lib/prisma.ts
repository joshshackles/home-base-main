import { PrismaClient } from "@prisma/client";
import { databaseUrlHelpText, normalizeDatabaseEnv } from "@/lib/database-env";

normalizeDatabaseEnv();

if (!process.env.DATABASE_URL) {
  throw new Error(databaseUrlHelpText());
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
