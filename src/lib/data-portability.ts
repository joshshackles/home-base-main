import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

type PortableModel = {
  key: string;
  delegate: string;
  idField?: string;
};

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
  { key: "leaseNotes", delegate: "leaseNote" },
  { key: "documentRequests", delegate: "documentRequest" },
  { key: "recurringChargeSchedules", delegate: "recurringChargeSchedule" },
  { key: "paymentPlans", delegate: "paymentPlan" },
  { key: "paymentPlanInstallments", delegate: "paymentPlanInstallment" },
  { key: "ledgerEntries", delegate: "ledgerEntry" },
  { key: "auditLogs", delegate: "auditLog" },
  { key: "securityEvents", delegate: "securityEvent" },
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
      const rows = await delegateFor(model).findMany();
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

  for (const model of DATA_PORTABILITY_MODELS) {
    const rows = snapshot.data[model.key];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const delegate = delegateFor(model);
    const idField = model.idField ?? "id";
    let count = 0;

    for (const row of rows) {
      const data = sanitizeRecord(model, row);
      const id = data?.[idField];
      if (!id) throw new Error(`Each ${model.key} import record must include ${idField}.`);
      const { [idField]: _id, ...updateData } = data;

      await delegate.upsert({
        where: { [idField]: id },
        update: updateData,
        create: data
      });
      count += 1;
    }

    counts[model.key] = count;
  }

  return counts;
}
