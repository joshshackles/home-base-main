import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

type PortableModel = {
  key: string;
  delegate: string;
  idField?: string;
};

const EXPORT_BATCH_SIZE = 500;
const IMPORT_BATCH_SIZE = 100;

export const DATA_PORTABILITY_MODELS: PortableModel[] = [
  { key: "users", delegate: "user" },
  { key: "accountAccessRequests", delegate: "accountAccessRequest" },
  { key: "properties", delegate: "property" },
  { key: "units", delegate: "unit" },
  { key: "unitPhotos", delegate: "unitPhoto" },
  { key: "leads", delegate: "lead" },
  { key: "leadNotes", delegate: "leadNote" },
  { key: "applications", delegate: "application" },
  { key: "applicationNotes", delegate: "applicationNote" },
  { key: "applicantProfiles", delegate: "applicantProfile" },
  { key: "householdMembers", delegate: "householdMember" },
  { key: "incomeSources", delegate: "incomeSource" },
  { key: "favoriteRentals", delegate: "favoriteRental" },
  { key: "utilityAccounts", delegate: "utilityAccount" },
  { key: "payrollReminders", delegate: "payrollReminder" },
  { key: "tenantPayments", delegate: "tenantPayment" },
  { key: "renterPaymentMethods", delegate: "renterPaymentMethod" },
  { key: "rentBillingPolicies", delegate: "rentBillingPolicy" },
  { key: "scheduledPayments", delegate: "scheduledPayment" },
  { key: "paymentEvents", delegate: "paymentEvent" },
  { key: "autoPayEnrollments", delegate: "autoPayEnrollment" },
  { key: "paymentRetryAttempts", delegate: "paymentRetryAttempt" },
  { key: "financialAdjustments", delegate: "financialAdjustment" },
  { key: "ownerStatements", delegate: "ownerStatement" },
  { key: "ownerStatementItems", delegate: "ownerStatementItem" },
  { key: "paymentDisputes", delegate: "paymentDispute" },
  { key: "vendorPayouts", delegate: "vendorPayout" },
  { key: "vendorProfiles", delegate: "vendorProfile" },
  { key: "vendorWorkLogs", delegate: "vendorWorkLog" },
  { key: "vendorInvoices", delegate: "vendorInvoice" },
  { key: "securityDepositAccounts", delegate: "securityDepositAccount" },
  { key: "accountingExports", delegate: "accountingExport" },
  { key: "creditReportingRecords", delegate: "creditReportingRecord" },
  { key: "financialInsightSnapshots", delegate: "financialInsightSnapshot" },
  { key: "documents", delegate: "document" },
  { key: "storedDocuments", delegate: "storedDocument" },
  { key: "inspections", delegate: "inspection" },
  { key: "inspectionChecklistItems", delegate: "inspectionChecklistItem" },
  { key: "maintenanceRequests", delegate: "maintenanceRequest" },
  { key: "messageThreads", delegate: "messageThread" },
  { key: "messages", delegate: "message" },
  { key: "leaseTemplates", delegate: "leaseTemplate" },
  { key: "leasePackets", delegate: "leasePacket" },
  { key: "signatureRequests", delegate: "signatureRequest" },
  { key: "signatureNotifications", delegate: "signatureNotification" },
  { key: "notificationTemplates", delegate: "notificationTemplate" },
  { key: "notificationPreferences", delegate: "notificationPreference" },
  { key: "notificationDeliveries", delegate: "notificationDelivery" },
  { key: "formalNotices", delegate: "formalNotice" },
  { key: "leaseNotes", delegate: "leaseNote" },
  { key: "documentRequests", delegate: "documentRequest" },
  { key: "taskItems", delegate: "taskItem" },
  { key: "recurringChargeSchedules", delegate: "recurringChargeSchedule" },
  { key: "paymentPlans", delegate: "paymentPlan" },
  { key: "paymentPlanInstallments", delegate: "paymentPlanInstallment" },
  { key: "ledgerEntries", delegate: "ledgerEntry" },
  { key: "auditLogs", delegate: "auditLog" },
  { key: "securityEvents", delegate: "securityEvent" },
  { key: "adminBrandingSettings", delegate: "adminBrandingSettings" },
  { key: "adminBackupSnapshots", delegate: "adminBackupSnapshot" },
  { key: "adminAnalyticsSnapshots", delegate: "adminAnalyticsSnapshot" },
  { key: "adminSystemHealthSnapshots", delegate: "adminSystemHealthSnapshot" },
  { key: "adminOperationalAlerts", delegate: "adminOperationalAlert" },
  { key: "adminQueueJobs", delegate: "adminQueueJob" },
  { key: "adminAutomationRules", delegate: "adminAutomationRule" },
  { key: "applicationClaimTokens", delegate: "applicationClaimToken" },
  { key: "rateLimitBuckets", delegate: "rateLimitBucket", idField: "key" }
];

export type DataSnapshot = {
  version: 1;
  exportedAt: string;
  exportedBy?: string | null;
  data: Record<string, unknown[]>;
};

function delegateFor(model: PortableModel) {
  return (prisma as any)[model.delegate];
}

async function findAllForExport(model: PortableModel) {
  const delegate = delegateFor(model);
  const idField = model.idField ?? "id";
  const rows: unknown[] = [];

  for (let skip = 0; ; skip += EXPORT_BATCH_SIZE) {
    const batch = await delegate.findMany({
      orderBy: { [idField]: "asc" },
      skip,
      take: EXPORT_BATCH_SIZE
    });
    rows.push(...batch);
    if (batch.length < EXPORT_BATCH_SIZE) break;
  }

  return rows;
}

function sanitizeRecord(model: PortableModel, record: any) {
  if (model.key !== "users") return record;
  const { password, ...rest } = record;
  if (typeof password === "string" && password.length > 0 && !rest.passwordHash) {
    rest.passwordHash = hashPassword(password);
    rest.forcePasswordReset = true;
    rest.passwordChangedAt = null;
  }
  return rest;
}

export async function exportDataSnapshot(exportedBy?: string | null): Promise<DataSnapshot> {
  const entries = await Promise.all(
    DATA_PORTABILITY_MODELS.map(async (model) => {
      const rows = await findAllForExport(model);
      return [model.key, rows] as const;
    })
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy,
    data: Object.fromEntries(entries)
  };
}

export async function importDataSnapshot(snapshot: DataSnapshot) {
  if (!snapshot || snapshot.version !== 1 || !snapshot.data || typeof snapshot.data !== "object") {
    throw new Error("Import file must be a HomeBase data snapshot with version 1.");
  }

  const counts: Record<string, number> = {};
  const allowedKeys = new Set(DATA_PORTABILITY_MODELS.map((model) => model.key));
  for (const key of Object.keys(snapshot.data)) {
    if (!allowedKeys.has(key)) throw new Error(`Import file includes unsupported data section: ${key}.`);
  }

  for (const model of DATA_PORTABILITY_MODELS) {
    const rows = snapshot.data[model.key];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const delegate = delegateFor(model);
    const idField = model.idField ?? "id";
    let count = 0;

    for (let index = 0; index < rows.length; index += IMPORT_BATCH_SIZE) {
      const operations = rows.slice(index, index + IMPORT_BATCH_SIZE).map((row) => {
        const data = sanitizeRecord(model, row);
        const id = data?.[idField];
        if (!id) throw new Error(`Each ${model.key} import record must include ${idField}.`);
        const { [idField]: _id, ...updateData } = data;

        return delegate.upsert({
          where: { [idField]: id },
          update: updateData,
          create: data
        });
      });

      await prisma.$transaction(operations);
      count += operations.length;
    }

    counts[model.key] = count;
  }

  return counts;
}
