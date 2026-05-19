import { afterEach, describe, expect, it } from "vitest";
import { emailFromAddress, emailMaxAttempts, emailProvider, queuedEmailBatchSize, shouldSendEmailOnQueue } from "@/lib/email";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("email configuration", () => {
  it("defaults to console provider and safe queue settings", () => {
    delete process.env.EMAIL_PROVIDER;
    delete process.env.EMAIL_QUEUE_BATCH_SIZE;
    delete process.env.EMAIL_MAX_ATTEMPTS;
    delete process.env.EMAIL_SEND_ON_QUEUE;

    expect(emailProvider()).toBe("console");
    expect(queuedEmailBatchSize()).toBe(25);
    expect(emailMaxAttempts()).toBe(5);
    expect(shouldSendEmailOnQueue()).toBe(false);
  });

  it("normalizes invalid queue sizes and attempt counts", () => {
    process.env.EMAIL_QUEUE_BATCH_SIZE = "10000";
    process.env.EMAIL_MAX_ATTEMPTS = "10000";

    expect(queuedEmailBatchSize()).toBe(200);
    expect(emailMaxAttempts()).toBe(20);
  });

  it("allows configured providers and sender", () => {
    process.env.EMAIL_PROVIDER = "resend";
    process.env.EMAIL_FROM = "HomeBase <leases@example.com>";
    process.env.EMAIL_SEND_ON_QUEUE = "true";

    expect(emailProvider()).toBe("resend");
    expect(emailFromAddress()).toBe("HomeBase <leases@example.com>");
    expect(shouldSendEmailOnQueue()).toBe(true);
  });
});
