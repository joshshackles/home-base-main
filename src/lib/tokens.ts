import { createHash, randomBytes } from "crypto";

export function createSecureToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function appUrl() {
  const configured = process.env.APP_URL;

  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_URL must be set in production before generating public links.");
    }

    return "http://localhost:3000";
  }

  const url = configured.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production" && /^http:\/\//i.test(url)) {
    throw new Error("APP_URL must use HTTPS in production.");
  }

  return url;
}
