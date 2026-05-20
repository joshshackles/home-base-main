import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountAccessRequestStatus, AccountAccessType, ConnectionRole, ConnectionStatus, DocumentVisibility, UserRole } from "@prisma/client";

const { prismaMock, writeAuditLogMock } = vi.hoisted(() => {
  const prismaMock = {
    accountAccessRequest: { findFirst: vi.fn() },
    application: { findUnique: vi.fn() },
    document: { findFirst: vi.fn(), findUnique: vi.fn() },
    inspection: { findUnique: vi.fn() },
    leasePacket: { findUnique: vi.fn() },
    ledgerEntry: { findUnique: vi.fn() },
    maintenanceRequest: { findUnique: vi.fn() },
    messageThread: { findUnique: vi.fn() },
    occupancy: { count: vi.fn() },
    profileConnection: { findFirst: vi.fn() },
    property: { findUnique: vi.fn() },
    unit: { findUnique: vi.fn() }
  };
  return { prismaMock, writeAuditLogMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/audit", () => ({ writeAuditLog: writeAuditLogMock }));

const landlordA = { userId: "landlord-a", email: "landlord-a@example.com", role: UserRole.LANDLORD };
const landlordB = { userId: "landlord-b", email: "landlord-b@example.com", role: UserRole.LANDLORD };
const applicantA = { userId: "applicant-a", email: "applicant-a@example.com", role: UserRole.APPLICANT };
const applicantB = { userId: "applicant-b", email: "applicant-b@example.com", role: UserRole.APPLICANT };
const vendorA = { userId: "vendor-a", email: "vendor-a@example.com", role: UserRole.VENDOR };
const propertyManagerA = { userId: "pm-a", email: "pm-a@example.com", role: UserRole.APPLICANT };
const caseworkerA = { userId: "caseworker-a", email: "caseworker-a@example.com", role: UserRole.APPLICANT };
const admin = { userId: "admin-a", email: "admin@example.com", role: UserRole.ADMIN };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.accountAccessRequest.findFirst.mockResolvedValue(null);
  prismaMock.profileConnection.findFirst.mockResolvedValue(null);
  prismaMock.occupancy.count.mockResolvedValue(0);
});

describe("authorization guessed-ID protections", () => {
  it("blocks a landlord from opening another landlord's application by guessed ID", async () => {
    const { canAccessApplication } = await import("@/lib/authorization");
    prismaMock.application.findUnique.mockResolvedValue({
      id: "application-b",
      applicantUserId: applicantB.userId,
      applicantEmail: applicantB.email,
      unit: { id: "unit-b", property: { ownerId: landlordB.userId, isArchived: false } }
    });

    await expect(canAccessApplication(landlordA, "application-b")).resolves.toBe(false);
  });

  it("allows the owning landlord and matching applicant to open an application", async () => {
    const { canAccessApplication } = await import("@/lib/authorization");
    prismaMock.application.findUnique.mockResolvedValue({
      id: "application-a",
      applicantUserId: applicantA.userId,
      applicantEmail: applicantA.email,
      unit: { id: "unit-a", property: { ownerId: landlordA.userId, isArchived: false } }
    });

    await expect(canAccessApplication(landlordA, "application-a")).resolves.toBe(true);
    await expect(canAccessApplication(applicantA, "application-a")).resolves.toBe(true);
  });

  it("blocks applicants from opening another applicant's application by guessed ID", async () => {
    const { canAccessApplication } = await import("@/lib/authorization");
    prismaMock.application.findUnique.mockResolvedValue({
      id: "application-b",
      applicantUserId: applicantB.userId,
      applicantEmail: applicantB.email,
      unit: { id: "unit-b", property: { ownerId: landlordB.userId, isArchived: false } }
    });

    await expect(canAccessApplication(applicantA, "application-b")).resolves.toBe(false);
  });

  it("blocks nonpublic units for unrelated landlords but allows active tenants", async () => {
    const { canAccessUnit } = await import("@/lib/authorization");
    prismaMock.unit.findUnique.mockResolvedValue({
      id: "unit-b",
      tenantUserId: applicantA.userId,
      property: { ownerId: landlordB.userId, isArchived: false },
      applications: [],
      occupancies: [{ id: "occupancy-a" }]
    });

    await expect(canAccessUnit(landlordA, "unit-b")).resolves.toBe(false);
    await expect(canAccessUnit(applicantA, "unit-b")).resolves.toBe(true);
  });

  it("limits maintenance requests to participants, assignees, owners, and admins", async () => {
    const { canAccessMaintenanceRequest } = await import("@/lib/authorization");
    prismaMock.maintenanceRequest.findUnique.mockResolvedValue({
      id: "maintenance-b",
      requesterId: applicantB.userId,
      assignedToId: "vendor-b",
      applicationId: null,
      unit: { id: "unit-b", property: { ownerId: landlordB.userId, isArchived: false } }
    });

    await expect(canAccessMaintenanceRequest(vendorA, "maintenance-b")).resolves.toBe(false);
    await expect(canAccessMaintenanceRequest(admin, "maintenance-b")).resolves.toBe(true);
  });

  it("does not let message threads bypass linked application permissions", async () => {
    const { canAccessMessageThread } = await import("@/lib/authorization");
    prismaMock.messageThread.findUnique.mockResolvedValue({
      id: "thread-b",
      createdById: applicantB.userId,
      applicationId: "application-b",
      maintenanceRequestId: null
    });
    prismaMock.application.findUnique.mockResolvedValue({
      id: "application-b",
      applicantUserId: applicantB.userId,
      applicantEmail: applicantB.email,
      unit: { id: "unit-b", property: { ownerId: landlordB.userId, isArchived: false } }
    });

    await expect(canAccessMessageThread(landlordA, "thread-b")).resolves.toBe(false);
  });

  it("allows lease packet access only for assigned signers or linked application participants", async () => {
    const { canAccessLeasePacket } = await import("@/lib/authorization");
    prismaMock.leasePacket.findUnique.mockResolvedValue({
      id: "lease-a",
      applicationId: "application-a",
      signatureRequests: [{ id: "signature-a" }]
    });

    await expect(canAccessLeasePacket(applicantA, "lease-a")).resolves.toBe(true);
  });

  it("returns null for a guessed document that is not visible through ownership or relationships", async () => {
    const { getAuthorizedDocument } = await import("@/lib/authorization");
    prismaMock.document.findFirst.mockResolvedValue(null);
    prismaMock.document.findUnique.mockResolvedValue({
      id: "document-b",
      visibility: DocumentVisibility.LANDLORD,
      unitId: null,
      applicationId: null,
      leasePacketId: null,
      propertyId: null
    });

    await expect(getAuthorizedDocument(applicantA, "document-b")).resolves.toBeNull();
  });

  it("logs denied assertions so guessed-ID attempts are auditable", async () => {
    const { assertCanAccessApplication } = await import("@/lib/authorization");
    prismaMock.application.findUnique.mockResolvedValue({
      id: "application-b",
      applicantUserId: applicantB.userId,
      applicantEmail: applicantB.email,
      unit: { id: "unit-b", property: { ownerId: landlordB.userId, isArchived: false } }
    });

    await expect(assertCanAccessApplication(landlordA, "application-b")).rejects.toThrow("You do not have permission to access this record.");
    expect(writeAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      actor: landlordA,
      entityType: "Application",
      entityId: "application-b"
    }));
  });

  it("honors approved property manager access requests without granting unrelated records", async () => {
    const { hasApprovedAccessType, canAccessApplication } = await import("@/lib/authorization");
    prismaMock.accountAccessRequest.findFirst.mockImplementation(({ where }: { where: { type?: { in?: AccountAccessType[] }; status?: AccountAccessRequestStatus } }) => {
      if (where.status === AccountAccessRequestStatus.APPROVED && where.type?.in?.includes(AccountAccessType.PROPERTY_MANAGER)) {
        return Promise.resolve({ id: "access-a" });
      }
      return Promise.resolve(null);
    });
    prismaMock.application.findUnique.mockResolvedValue({
      id: "application-b",
      applicantUserId: applicantB.userId,
      applicantEmail: applicantB.email,
      unit: { id: "unit-b", property: { ownerId: landlordB.userId, isArchived: false } }
    });

    await expect(hasApprovedAccessType(landlordA, [AccountAccessType.PROPERTY_MANAGER])).resolves.toBe(true);
    await expect(canAccessApplication(landlordA, "application-b")).resolves.toBe(false);
  });

  it("allows a property manager to access only the owner portfolio they are connected to", async () => {
    const { canAccessApplication } = await import("@/lib/authorization");
    prismaMock.accountAccessRequest.findFirst.mockImplementation(({ where }: { where: { type?: { in?: AccountAccessType[] }; status?: AccountAccessRequestStatus } }) => {
      if (where.status === AccountAccessRequestStatus.APPROVED && where.type?.in?.includes(AccountAccessType.PROPERTY_MANAGER)) {
        return Promise.resolve({ id: "pm-access" });
      }
      return Promise.resolve(null);
    });
    prismaMock.profileConnection.findFirst.mockImplementation(({ where }: { where: { landlordUserId: string; targetUserId: string; assignedRole?: { in?: ConnectionRole[] }; status: ConnectionStatus } }) => {
      if (
        where.landlordUserId === landlordA.userId &&
        where.targetUserId === propertyManagerA.userId &&
        where.status === ConnectionStatus.ACTIVE &&
        where.assignedRole?.in?.includes(ConnectionRole.PROPERTY_MANAGER)
      ) {
        return Promise.resolve({ id: "pm-connection-a" });
      }
      return Promise.resolve(null);
    });

    prismaMock.application.findUnique.mockResolvedValueOnce({
      id: "application-a",
      applicantUserId: applicantA.userId,
      applicantEmail: applicantA.email,
      unit: { id: "unit-a", property: { ownerId: landlordA.userId, isArchived: false } }
    });
    await expect(canAccessApplication(propertyManagerA, "application-a")).resolves.toBe(true);

    prismaMock.application.findUnique.mockResolvedValueOnce({
      id: "application-b",
      applicantUserId: applicantB.userId,
      applicantEmail: applicantB.email,
      unit: { id: "unit-b", property: { ownerId: landlordB.userId, isArchived: false } }
    });
    await expect(canAccessApplication(propertyManagerA, "application-b")).resolves.toBe(false);
  });

  it("lets connected caseworkers support housing records without granting ledger access", async () => {
    const { canAccessApplication, canAccessLedgerEntry } = await import("@/lib/authorization");
    prismaMock.accountAccessRequest.findFirst.mockImplementation(({ where }: { where: { type?: { in?: AccountAccessType[] }; status?: AccountAccessRequestStatus } }) => {
      if (where.status === AccountAccessRequestStatus.APPROVED && where.type?.in?.includes(AccountAccessType.CASEWORKER)) {
        return Promise.resolve({ id: "caseworker-access" });
      }
      return Promise.resolve(null);
    });
    prismaMock.profileConnection.findFirst.mockImplementation(({ where }: { where: { landlordUserId: string; targetUserId: string; assignedRole?: { in?: ConnectionRole[] }; status: ConnectionStatus } }) => {
      if (
        where.landlordUserId === landlordA.userId &&
        where.targetUserId === caseworkerA.userId &&
        where.status === ConnectionStatus.ACTIVE &&
        where.assignedRole?.in?.includes(ConnectionRole.CASEWORKER)
      ) {
        return Promise.resolve({ id: "caseworker-connection-a" });
      }
      return Promise.resolve(null);
    });
    prismaMock.application.findUnique.mockResolvedValue({
      id: "application-a",
      applicantUserId: applicantA.userId,
      applicantEmail: applicantA.email,
      unit: { id: "unit-a", property: { ownerId: landlordA.userId, isArchived: false } }
    });
    prismaMock.ledgerEntry.findUnique.mockResolvedValue({
      id: "ledger-a",
      tenantUserId: applicantA.userId,
      applicationId: null,
      unit: { id: "unit-a", property: { ownerId: landlordA.userId, isArchived: false } }
    });

    await expect(canAccessApplication(caseworkerA, "application-a")).resolves.toBe(true);
    await expect(canAccessLedgerEntry(caseworkerA, "ledger-a")).resolves.toBe(false);
  });

  it("does not let inspector approval open unrelated inspections without assignment or scoped connection", async () => {
    const { canAccessInspection } = await import("@/lib/authorization");
    prismaMock.accountAccessRequest.findFirst.mockImplementation(({ where }: { where: { type?: { in?: AccountAccessType[] }; status?: AccountAccessRequestStatus } }) => {
      if (where.status === AccountAccessRequestStatus.APPROVED && where.type?.in?.includes(AccountAccessType.INSPECTOR)) {
        return Promise.resolve({ id: "inspector-access" });
      }
      return Promise.resolve(null);
    });
    prismaMock.inspection.findUnique.mockResolvedValue({
      id: "inspection-b",
      assignedToId: "inspector-b",
      applicationId: null,
      unit: { id: "unit-b", property: { ownerId: landlordB.userId, isArchived: false } }
    });

    await expect(canAccessInspection({ userId: "inspector-a", email: "inspector-a@example.com", role: UserRole.INSPECTOR }, "inspection-b")).resolves.toBe(false);
  });

  it("requires role-specific active profile connections before sharing connected unit access", async () => {
    const { canAccessUnit } = await import("@/lib/authorization");
    prismaMock.unit.findUnique.mockResolvedValue({
      id: "unit-b",
      tenantUserId: null,
      property: { ownerId: landlordB.userId, isArchived: false },
      propertyManagerUserId: null,
      maintenanceUserId: null,
      caseworkerUserId: null,
      applications: [],
      occupancies: []
    });
    prismaMock.accountAccessRequest.findFirst.mockImplementation(({ where }: { where: { type?: { in?: AccountAccessType[] }; status?: AccountAccessRequestStatus } }) => {
      if (where.status === AccountAccessRequestStatus.APPROVED && where.type?.in?.includes(AccountAccessType.PROPERTY_MANAGER)) {
        return Promise.resolve({ id: "pm-access" });
      }
      return Promise.resolve(null);
    });
    prismaMock.profileConnection.findFirst.mockImplementation(({ where }: { where: { status: ConnectionStatus; landlordUserId: string; assignedRole?: { in?: ConnectionRole[] } } }) => {
      if (where.status === ConnectionStatus.ACTIVE && where.landlordUserId === landlordB.userId && where.assignedRole?.in?.includes(ConnectionRole.PROPERTY_MANAGER)) {
        return Promise.resolve({ id: "connection-a" });
      }
      return Promise.resolve(null);
    });

    await expect(canAccessUnit(propertyManagerA, "unit-b")).resolves.toBe(true);
  });
});
