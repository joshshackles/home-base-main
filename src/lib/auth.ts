import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "homebase_mls_session";
const DEFAULT_SESSION_HOURS = 8;

type SessionPayload = {
  userId: string;
  email: string;
  name: string | null;
  role: UserRole;
  expiresAt: number;
};

function getAuthSecret() {
  return process.env.AUTH_SECRET || "dev-only-change-this-secret-before-deployment";
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(value: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed?.userId || !parsed?.email || !parsed?.role || !parsed?.expiresAt) return null;
    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

export function createSessionToken(payload: Omit<SessionPayload, "expiresAt">) {
  const expiresAt = Date.now() + DEFAULT_SESSION_HOURS * 60 * 60 * 1000;
  const encodedPayload = encodePayload({ ...payload, expiresAt });
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function readSessionToken(token?: string | null) {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const supplied = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  const payload = decodePayload(encodedPayload);
  if (!payload || payload.expiresAt < Date.now()) return null;

  return payload;
}

export function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return readSessionToken(token);
}

export async function requireUser(nextPath = "/admin") {
  const sessionUser = getCurrentUser();
  if (!sessionUser) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    select: { id: true, email: true, name: true, role: true, isActive: true, forcePasswordReset: true }
  });

  if (!dbUser || !dbUser.isActive) {
    redirect(`/login?error=${encodeURIComponent("Your session is no longer valid. Please sign in again.")}&next=${encodeURIComponent(nextPath)}`);
  }

  if (dbUser.forcePasswordReset && nextPath !== "/account/password") {
    redirect("/account/password?reason=required");
  }

  return {
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    expiresAt: sessionUser.expiresAt
  } satisfies SessionPayload;
}

export async function requireRole(allowedRoles: UserRole[], nextPath = "/admin") {
  const user = await requireUser(nextPath);
  if (!allowedRoles.includes(user.role)) redirect("/not-authorized");
  return user;
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEFAULT_SESSION_HOURS * 60 * 60
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export { SESSION_COOKIE };
