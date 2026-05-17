export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { csvDownloadResponse, toCsv } from "@/lib/csv";
import { requireRole } from "@/lib/auth";
import { filterLandlordContacts, getLandlordContactsList } from "@/lib/profile-connections";

function firstParam(value: string | null) {
  return value?.trim() || undefined;
}

export async function GET(request: Request) {
  const user = await requireRole(["LANDLORD"], "/landlord/contacts");
  const url = new URL(request.url);
  const contacts = await getLandlordContactsList(user.userId);
  const filteredContacts = filterLandlordContacts(contacts, {
    query: firstParam(url.searchParams.get("q")),
    source: firstParam(url.searchParams.get("source")),
    role: firstParam(url.searchParams.get("role")),
  });

  const csv = toCsv(
    ["Name", "Email", "System Role", "Assignment", "Scope", "Unit ID", "Sources", "Notes", "Created At", "Updated At"],
    filteredContacts.map((contact) => [
      contact.name,
      contact.email,
      contact.systemRole,
      String(contact.assignedRole),
      contact.scopedUnit,
      contact.unitId,
      contact.sources.join("; "),
      contact.notes,
      contact.createdAt,
      contact.updatedAt,
    ])
  );

  return csvDownloadResponse(`homebase-contacts-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
