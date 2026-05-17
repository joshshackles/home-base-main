import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("structured logger", () => {
  it("redacts secret-like context fields", () => {
    process.env.LOG_LEVEL = "debug";
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    logger.info("test message", { token: "abc", nested: { password: "secret", safe: "ok" } });

    const line = spy.mock.calls[0]?.[0] as string;
    expect(line).toContain("test message");
    expect(line).toContain("[redacted]");
    expect(line).not.toContain("abc");
    expect(line).not.toContain("secret");
  });

  it("respects LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "error";
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    logger.info("not emitted");

    expect(spy).not.toHaveBeenCalled();
  });
});
