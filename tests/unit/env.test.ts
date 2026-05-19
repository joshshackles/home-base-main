import { afterEach, describe, expect, it } from "vitest";
import { getDocumentStorageProvider, getEnvironmentWarnings } from "@/lib/env";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("environment validation", () => {
  it("defaults document storage based on environment", () => {
    process.env.NODE_ENV = "test";
    delete process.env.DOCUMENT_STORAGE_PROVIDER;
    expect(getDocumentStorageProvider()).toBe("local");

    process.env.NODE_ENV = "production";
    expect(getDocumentStorageProvider()).toBe("database");
  });

  it("warns when production APP_URL is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.APP_URL;
    const warnings = getEnvironmentWarnings();
    expect(warnings.some((warning) => warning.includes("APP_URL is required"))).toBe(true);
  });

  it("warns when s3 provider lacks required object storage settings", () => {
    process.env.DOCUMENT_STORAGE_PROVIDER = "s3";
    delete process.env.DOCUMENT_S3_BUCKET;
    const warnings = getEnvironmentWarnings();
    expect(warnings.some((warning) => warning.includes("DOCUMENT_S3_BUCKET"))).toBe(true);
  });
});
