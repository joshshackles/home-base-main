import crypto from "node:crypto";
import { AdminAnalyticsPeriod, AdminAutomationRuleStatus, AdminBackupStatus, AdminBrandingThemeMode, AdminOperationalAlertSeverity, AdminOperationalAlertStatus, AdminQueueJobStatus, AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exportDataSnapshot } from "@/lib/data-portability";
import { ledgerTotals } from "@/lib/ledger-queries";
import { writeAuditLog } from "@/lib/audit";
import type { AuthorizedUser } from "@/lib/authorization";
import { getEnvironmentWarnings } from "@/lib/env";
import { APP_RELEASE_LABEL, APP_VERSION } from "@/lib/app-version";

export const BRANDING_SINGLETON_ID = "global";

export type BrandingFormPayload = {
  productName: string;
  shortName: string;
  tagline: string;
  homepageHeadline: string;
  homepageSubheadline: string;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  logoMarkText: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  supportEmail?: string | null;
  themeMode: AdminBrandingThemeMode;
  publicSignupEnabled: boolean;
  marketplaceEnabled: boolean;
};

export async function getBrandingSettings() {
  return prisma.adminBrandingSettings.upsert({
    where: { id: BRANDING_SINGLETON_ID },
    update: {},
    create: { id: BRANDING_SINGLETON_ID }
  });
}

export async function saveBrandingSettings(actor: AuthorizedUser, payload: BrandingFormPayload) {
  const settings = await prisma.adminBrandingSettings.upsert({
    where: { id: BRANDING_SINGLETON_ID },
    update: payload,
    create: { id: BRANDING_SINGLETON_ID, ...payload }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.UPDATE,
    entityType: "AdminBrandingSettings",
    entityId: settings.id,
    message: "Updated public brand and admin identity settings.",
    metadata: { productName: settings.productName, primaryColor: settings.primaryColor, marketplaceEnabled: settings.marketplaceEnabled }
  });

  return settings;
}


export type OperationalRiskFactor = {
  key: string;
  label: string;
  count: number;
  points: number;
  detail: string;
};

export type OperationalRiskSummary = {
  score: number;
  level: "LOW" | "MODERATE" | "ELEVATED" | "CRITICAL";
  label: string;
  detail: string;
  factors: OperationalRiskFactor[];
};

function cappedPoints(count: number, multiplier: number, cap: number) {
  return Math.min(cap, Math.max(0, count) * multiplier);
}

export function calculateOperationalRiskScore(input: {
  submittedApplications: number;
  inspectionsOpen: number;
  maintenanceOpen: number;
  threadsOpen: number;
  pendingAccess: number;
  securityEvents7: number;
}): OperationalRiskSummary {
  const factors: OperationalRiskFactor[] = [
    {
      key: "applications",
      label: "Submitted applications",
      count: input.submittedApplications,
      points: cappedPoints(input.submittedApplications, 2, 20),
      detail: "+2 each, capped at 20."
    },
    {
      key: "inspections",
      label: "Open inspections",
      count: input.inspectionsOpen,
      points: cappedPoints(input.inspectionsOpen, 3, 15),
      detail: "+3 each, capped at 15."
    },
    {
      key: "maintenance",
      label: "Open maintenance",
      count: input.maintenanceOpen,
      points: cappedPoints(input.maintenanceOpen, 3, 20),
      detail: "+3 each, capped at 20."
    },
    {
      key: "threads",
      label: "Open message threads",
      count: input.threadsOpen,
      points: cappedPoints(input.threadsOpen, 1, 10),
      detail: "+1 each, capped at 10."
    },
    {
      key: "access",
      label: "Pending access requests",
      count: input.pendingAccess,
      points: cappedPoints(input.pendingAccess, 5, 15),
      detail: "+5 each, capped at 15."
    },
    {
      key: "security",
      label: "Security events, 7 days",
      count: input.securityEvents7,
      points: Math.min(20, Math.ceil(Math.max(0, input.securityEvents7) / 5)),
      detail: "+1 per five recent events, capped at 20."
    }
  ];

  const score = Math.min(100, factors.reduce((total, factor) => total + factor.points, 0));
  const level = score >= 75 ? "CRITICAL" : score >= 40 ? "ELEVATED" : score >= 15 ? "MODERATE" : "LOW";
  const label = level === "LOW" ? "Low" : level === "MODERATE" ? "Moderate" : level === "ELEVATED" ? "Elevated" : "Critical";
  const activeFactors = factors.filter((factor) => factor.points > 0).length;
  const detail = activeFactors === 0 ? "No active workload or access/security signals are currently raising operational risk." : `${activeFactors} active signal${activeFactors === 1 ? "" : "s"} contributing to the score.`;

  return { score, level, label, detail, factors };
}

export async function getAdminAnalyticsMetrics() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    users,
    activeUsers,
    landlords,
    applicants,
    properties,
    units,
    availableUnits,
    occupiedUnits,
    leads30,
    applications30,
    submittedApplications,
    inspectionsOpen,
    maintenanceOpen,
    threadsOpen,
    documents,
    securityEvents7,
    auditEvents7,
    pendingAccess,
    ledgerBalance
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "LANDLORD", isActive: true } }),
    prisma.user.count({ where: { role: { in: ["APPLICANT", "TENANT"] }, isActive: true } }),
    prisma.property.count({ where: { isArchived: false } }),
    prisma.unit.count({ where: { NOT: { status: "ARCHIVED" } } }),
    prisma.unit.count({ where: { status: "AVAILABLE", property: { isArchived: false } } }),
    prisma.unit.count({ where: { status: "OCCUPIED", property: { isArchived: false } } }),
    prisma.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.application.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.application.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.inspection.count({ where: { status: { in: ["SCHEDULED", "IN_PROGRESS", "NEEDS_REINSPECTION"] } } }),
    prisma.maintenanceRequest.count({ where: { status: { in: ["NEW", "IN_PROGRESS", "WAITING_ON_TENANT", "WAITING_ON_VENDOR"] } } }),
    prisma.messageThread.count({ where: { status: { not: "CLOSED" } } }),
    prisma.document.count(),
    prisma.securityEvent.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.accountAccessRequest.count({ where: { status: "PENDING" } }),
    ledgerTotals().then((totals) => totals.balance)
  ]);

  const occupancyRate = units > 0 ? Math.round((occupiedUnits / units) * 100) : 0;
  const listingAvailabilityRate = units > 0 ? Math.round((availableUnits / units) * 100) : 0;
  const applicationVelocity = leads30 > 0 ? Math.round((applications30 / leads30) * 100) : applications30 > 0 ? 100 : 0;

  const operationalRisk = calculateOperationalRiskScore({
    submittedApplications,
    inspectionsOpen,
    maintenanceOpen,
    threadsOpen,
    pendingAccess,
    securityEvents7
  });

  return {
    generatedAt: now.toISOString(),
    users,
    activeUsers,
    landlords,
    applicants,
    properties,
    units,
    availableUnits,
    occupiedUnits,
    occupancyRate,
    listingAvailabilityRate,
    leads30,
    applications30,
    submittedApplications,
    applicationVelocity,
    inspectionsOpen,
    maintenanceOpen,
    threadsOpen,
    documents,
    securityEvents7,
    auditEvents7,
    pendingAccess,
    ledgerBalance,
    operationalRisk
  };
}

export async function captureAnalyticsSnapshot(actor?: AuthorizedUser | null, period: AdminAnalyticsPeriod = AdminAnalyticsPeriod.DAILY) {
  const metrics = await getAdminAnalyticsMetrics();
  const periodKey = new Date().toISOString().slice(0, period === AdminAnalyticsPeriod.MONTHLY ? 7 : 10);
  const snapshot = await prisma.adminAnalyticsSnapshot.upsert({
    where: { period_periodKey: { period, periodKey } },
    update: { metrics },
    create: { period, periodKey, metrics }
  });

  if (actor) {
    await writeAuditLog({
      actor,
      action: AuditAction.CREATE,
      entityType: "AdminAnalyticsSnapshot",
      entityId: snapshot.id,
      message: "Captured admin analytics snapshot.",
      metadata: { period, periodKey }
    });
  }

  return snapshot;
}

export async function createBackupManifest(actor: AuthorizedUser, label?: string) {
  const snapshot = await exportDataSnapshot(actor.email);
  const serialized = JSON.stringify(snapshot);
  const recordCounts = Object.fromEntries(Object.entries(snapshot.data).map(([key, rows]) => [key, Array.isArray(rows) ? rows.length : 0]));
  const checksum = crypto.createHash("sha256").update(serialized).digest("hex");

  const backup = await prisma.adminBackupSnapshot.create({
    data: {
      label: label?.trim() || `Manual export ${new Date().toISOString().slice(0, 10)}`,
      status: AdminBackupStatus.GENERATED,
      recordCounts,
      checksum,
      sizeBytes: Buffer.byteLength(serialized),
      storageProvider: "download",
      requestedById: actor.userId,
      requestedByEmail: actor.email,
      downloadedAt: new Date()
    }
  });

  await writeAuditLog({
    actor,
    action: AuditAction.DOWNLOAD,
    entityType: "AdminBackupSnapshot",
    entityId: backup.id,
    message: "Generated downloadable HomeBase backup snapshot.",
    metadata: { checksum, sizeBytes: backup.sizeBytes, recordCounts }
  });

  return { backup, snapshot, serialized };
}

export async function markBackupRestoreStarted(actor: AuthorizedUser, backupId?: string | null, importedCount?: number) {
  if (backupId) {
    await prisma.adminBackupSnapshot.updateMany({
      where: { id: backupId },
      data: { status: AdminBackupStatus.RESTORE_COMPLETED, restoredAt: new Date() }
    });
  }
  await writeAuditLog({
    actor,
    action: AuditAction.UPLOAD,
    entityType: "AdminBackupSnapshot",
    entityId: backupId || "uploaded-json",
    message: "Completed data recovery import.",
    metadata: { importedCount }
  });
}

export async function listRecentBackups() {
  return prisma.adminBackupSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
}

export async function listRecentAnalyticsSnapshots() {
  return prisma.adminAnalyticsSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 12 });
}


export type DeploymentReadinessCheck = {
  key: string;
  label: string;
  ok: boolean;
  severity: "info" | "warning" | "critical";
  detail: string;
  actionHref?: string;
  actionLabel?: string;
};

function envPresent(name: string) {
  return Boolean(process.env[name] && String(process.env[name]).trim().length > 0);
}

export async function getDeploymentReadinessChecks(): Promise<DeploymentReadinessCheck[]> {
  const warnings = getEnvironmentWarnings();
  let databaseOk = true;
  let databaseMessage = "Database responded to SELECT 1.";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    databaseOk = false;
    databaseMessage = error instanceof Error ? error.message : "Database connection failed.";
  }

  const redisConfigured = envPresent("UPSTASH_REDIS_REST_URL") && envPresent("UPSTASH_REDIS_REST_TOKEN");
  const stripeConfigured = envPresent("STRIPE_SECRET_KEY") && envPresent("STRIPE_WEBHOOK_SECRET");
  const storageProvider = process.env.DOCUMENT_STORAGE_PROVIDER || (process.env.NODE_ENV === "production" ? "database" : "local");
  const objectStorageReady = storageProvider !== "database" || process.env.NODE_ENV !== "production";
  const cronReady = envPresent("CRON_SECRET");
  const authReady = envPresent("AUTH_SECRET") || envPresent("NEXTAUTH_SECRET");

  return [
    { key: "database", label: "Database", ok: databaseOk, severity: databaseOk ? "info" : "critical", detail: databaseMessage, actionHref: "/admin/system", actionLabel: "System" },
    { key: "environment", label: "Environment contract", ok: warnings.length === 0, severity: warnings.length === 0 ? "info" : "warning", detail: warnings.length === 0 ? "Required environment settings are present." : warnings.join(" "), actionHref: "/admin/system", actionLabel: "Review env" },
    { key: "stripe", label: "Stripe payments", ok: stripeConfigured, severity: stripeConfigured ? "info" : "critical", detail: stripeConfigured ? "Stripe secret key and webhook secret are configured." : "Configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET before collecting rent or processing webhooks.", actionHref: "/admin/ledger", actionLabel: "Payments" },
    { key: "redis", label: "Distributed rate limiting", ok: redisConfigured, severity: redisConfigured ? "info" : "warning", detail: redisConfigured ? "Upstash Redis credentials are present for distributed rate limits." : "In-memory rate limits are acceptable for demos but not for multi-instance production on Vercel.", actionHref: "/admin/security", actionLabel: "Security" },
    { key: "storage", label: "Document storage", ok: objectStorageReady, severity: objectStorageReady ? "info" : "warning", detail: `Provider: ${storageProvider}. ${objectStorageReady ? "Configuration is deployable." : "Use S3/R2 for leases, receipts, inspections, and backup artifacts at production scale."}`, actionHref: "/admin/documents", actionLabel: "Documents" },
    { key: "cron", label: "Cron and scheduled jobs", ok: cronReady, severity: cronReady ? "info" : "warning", detail: cronReady ? "CRON_SECRET is configured for scheduled rent, autopay, notices, and backups." : "Scheduled routes will reject production cron requests until CRON_SECRET is set.", actionHref: "/admin/operations", actionLabel: "Jobs" },
    { key: "auth", label: "Authentication hardening", ok: authReady, severity: authReady ? "info" : "warning", detail: authReady ? "Auth secret is configured for secure session signing." : "Set AUTH_SECRET/NEXTAUTH_SECRET before public production launch.", actionHref: "/admin/security", actionLabel: "Security" },
    { key: "version", label: "Release", ok: true, severity: "info", detail: APP_RELEASE_LABEL }
  ];
}

function severityForCheck(check: DeploymentReadinessCheck) {
  if (check.severity === "critical") return AdminOperationalAlertSeverity.CRITICAL;
  if (check.severity === "warning") return AdminOperationalAlertSeverity.WARNING;
  return AdminOperationalAlertSeverity.INFO;
}

export async function syncOperationalAlertsFromReadiness(actor?: AuthorizedUser | null) {
  const checks = await getDeploymentReadinessChecks();
  const createdOrUpdated = [];

  for (const check of checks.filter((item) => !item.ok)) {
    const alert = await prisma.adminOperationalAlert.upsert({
      where: { fingerprint: `readiness:${check.key}` },
      update: {
        severity: severityForCheck(check),
        status: AdminOperationalAlertStatus.OPEN,
        title: check.label,
        message: check.detail,
        actionHref: check.actionHref,
        actionLabel: check.actionLabel,
        metadata: { key: check.key, version: APP_VERSION }
      },
      create: {
        fingerprint: `readiness:${check.key}`,
        source: "deployment-readiness",
        severity: severityForCheck(check),
        title: check.label,
        message: check.detail,
        actionHref: check.actionHref,
        actionLabel: check.actionLabel,
        metadata: { key: check.key, version: APP_VERSION }
      }
    });
    createdOrUpdated.push(alert);
  }

  if (actor && createdOrUpdated.length > 0) {
    await writeAuditLog({
      actor,
      action: AuditAction.UPDATE,
      entityType: "AdminOperationalAlert",
      entityId: "readiness-sync",
      message: "Synced deployment readiness alerts.",
      metadata: { count: createdOrUpdated.length }
    });
  }

  return { checks, alerts: createdOrUpdated };
}

export async function captureSystemHealthSnapshot(actor?: AuthorizedUser | null) {
  const checks = await getDeploymentReadinessChecks();
  const okCount = checks.filter((check) => check.ok).length;
  const criticalCount = checks.filter((check) => !check.ok && check.severity === "critical").length;
  const warningCount = checks.filter((check) => !check.ok && check.severity === "warning").length;
  const score = checks.length > 0 ? Math.max(0, Math.round((okCount / checks.length) * 100) - criticalCount * 10 - warningCount * 3) : 100;
  const snapshot = await prisma.adminSystemHealthSnapshot.create({
    data: {
      score,
      checks,
      summary: { okCount, criticalCount, warningCount, appVersion: APP_VERSION }
    }
  });

  if (actor) {
    await writeAuditLog({
      actor,
      action: AuditAction.CREATE,
      entityType: "AdminSystemHealthSnapshot",
      entityId: snapshot.id,
      message: "Captured system health snapshot.",
      metadata: { score, okCount, criticalCount, warningCount }
    });
  }

  return snapshot;
}

export async function getOperationalIntelligenceSummary() {
  const [checks, alerts, queueJobs, automationRules, healthSnapshots, backups, analyticsSnapshots] = await Promise.all([
    getDeploymentReadinessChecks(),
    prisma.adminOperationalAlert.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 12 }),
    prisma.adminQueueJob.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.adminAutomationRule.findMany({ orderBy: { updatedAt: "desc" }, take: 12 }),
    prisma.adminSystemHealthSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.adminBackupSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.adminAnalyticsSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
  ]);

  const openAlerts = alerts.filter((alert) => alert.status === AdminOperationalAlertStatus.OPEN);
  const failedJobs = queueJobs.filter((job) => job.status === AdminQueueJobStatus.FAILED || job.status === AdminQueueJobStatus.RETRYING);
  const readinessScore = checks.length ? Math.round((checks.filter((check) => check.ok).length / checks.length) * 100) : 100;

  return {
    checks,
    alerts,
    queueJobs,
    automationRules,
    healthSnapshots,
    backups,
    analyticsSnapshots,
    metrics: {
      readinessScore,
      openAlertCount: openAlerts.length,
      criticalAlertCount: openAlerts.filter((alert) => alert.severity === AdminOperationalAlertSeverity.CRITICAL).length,
      failedJobCount: failedJobs.length,
      activeAutomationCount: automationRules.filter((rule) => rule.status === AdminAutomationRuleStatus.ACTIVE).length,
      latestHealthScore: healthSnapshots[0]?.score ?? readinessScore
    }
  };
}

export async function ensureDefaultAutomationRules(actor?: AuthorizedUser | null) {
  const defaults = [
    { name: "Escalate failed payments", description: "Create an operational alert when scheduled payment retries fail.", trigger: "payment.retry.failed", action: "create_alert" },
    { name: "Backup freshness monitor", description: "Warn admins when no backup manifest has been generated recently.", trigger: "backup.stale", action: "create_alert" },
    { name: "Webhook failure monitor", description: "Surface Stripe webhook and queue failures in the admin control center.", trigger: "webhook.failed", action: "create_alert" },
    { name: "Delinquency attention queue", description: "Highlight units with overdue rent, failed autopay, or high-risk financial insight snapshots.", trigger: "ledger.delinquency.detected", action: "create_alert" }
  ];

  const created = [];
  for (const rule of defaults) {
    const existing = await prisma.adminAutomationRule.findFirst({ where: { name: rule.name } });
    if (!existing) {
      created.push(await prisma.adminAutomationRule.create({ data: { ...rule, status: AdminAutomationRuleStatus.DRAFT, createdById: actor?.userId } }));
    }
  }

  if (actor && created.length > 0) {
    await writeAuditLog({
      actor,
      action: AuditAction.CREATE,
      entityType: "AdminAutomationRule",
      entityId: "default-rules",
      message: "Created default automation rule scaffolds.",
      metadata: { count: created.length }
    });
  }

  return created;
}
