import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { AccountAccessType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRequiredAuthSecret } from "@/lib/env";
import { hashToken } from "@/lib/tokens";

const SESSION_COOKIE = "homebase_mls_session";
const DEFAULT_SESSION_HOURS = 8;

export type SessionPayload = {
  userId: string;
  email: string;
  name: string | null;
  role: UserRole;
  expiresAt: number;
};

function getAuthSecret() {
  return getRequiredAuthSecret();
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

function readLegacySignedSessionToken(token?: string | null) {
  if (!token || !token.includes(".")) return null;
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

export function createSessionToken(payload: Omit<SessionPayload, "expiresAt">) {
  const expiresAt = Date.now() + DEFAULT_SESSION_HOURS * 60 * 60 * 1000;
  const encodedPayload = encodePayload({ ...payload, expiresAt });
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function createDatabaseSession(user: Omit<SessionPayload, "expiresAt">, options: { ipAddress?: string | null; userAgent?: string | null } = {}) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DEFAULT_SESSION_HOURS * 60 * 60 * 1000);

  await prisma.userSession.create({
    data: {
      userId: user.userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null
    }
  });

  return token;
}

async function readDatabaseSessionToken(token?: string | null) {
  if (!token || token.includes(".")) return null;
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) return null;

  await prisma.userSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => null);

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    expiresAt: session.expiresAt.getTime(),
    forcePasswordReset: session.user.forcePasswordReset
  };
}

export async function readSessionToken(token?: string | null) {
  const databaseSession = await readDatabaseSessionToken(token);
  if (databaseSession) return databaseSession;
  return readLegacySignedSessionToken(token);
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return readSessionToken(token);
}

export async function getVerifiedCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const databaseSession = await readDatabaseSessionToken(token);
  if (databaseSession) return databaseSession;

  const legacySession = readLegacySignedSessionToken(token);
  if (!legacySession) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: legacySession.userId },
    select: { id: true, email: true, name: true, role: true, isActive: true, forcePasswordReset: true }
  });

  if (!dbUser || !dbUser.isActive) return null;

  return {
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    expiresAt: legacySession.expiresAt,
    forcePasswordReset: dbUser.forcePasswordReset
  };
}

export async function requireUser(nextPath = "/admin") {
  const user = await getVerifiedCurrentUser();
  if (!user) redirect(`/login?error=${encodeURIComponent("Your session is no longer valid. Please sign in again.")}&next=${encodeURIComponent(nextPath)}`);

  if (user.forcePasswordReset && nextPath !== "/account/password") {
    redirect("/account/password?reason=required");
  }

  return {
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    expiresAt: user.expiresAt
  } satisfies SessionPayload;
}

const roleAccessTypes: Partial<Record<UserRole, AccountAccessType[]>> = {
  [UserRole.LANDLORD]: [AccountAccessType.LANDLORD, AccountAccessType.PROPERTY_MANAGER],
  [UserRole.INSPECTOR]: [AccountAccessType.INSPECTOR],
  [UserRole.VENDOR]: [AccountAccessType.VENDOR]
};

export async function requireRole(allowedRoles: UserRole[], nextPath = "/admin") {
  const user = await requireUser(nextPath);
  if (user.role === UserRole.ADMIN || allowedRoles.includes(user.role)) return user;

  const accessTypes = allowedRoles.flatMap((role) => roleAccessTypes[role] ?? []);
  if (accessTypes.length > 0) {
    const approvedAccess = await prisma.accountAccessRequest.findFirst({
      where: {
        userId: user.userId,
        type: { in: accessTypes },
        status: "APPROVED"
      },
      select: { id: true }
    });
    if (approvedAccess) return user;
  }

  redirect("/not-authorized");
}

export function getRequestClientMetadata() {
  const h = headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent") || null
  };
}

export async function revokeCurrentSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token && !token.includes(".")) {
    await prisma.userSession.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }
}

export async function revokeUserSessions(userId: string) {
  await prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
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
