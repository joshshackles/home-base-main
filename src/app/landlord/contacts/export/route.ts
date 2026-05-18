export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { csvDownloadResponse, toCsv } from "@/lib/csv";
import { requireRole } from "@/lib/auth";
import {
  contactCsvRows,
  filterLandlordContacts,
  getLandlordContactsList,
  sortLandlordContacts,
  type ContactSortMode,
} from "@/lib/profile-connections";

function firstParam(value: string | null) {
  return value?.trim() || undefined;
}

export async function GET(request: Request) {
  const user = await requireRole(["LANDLORD"], "/landlord/contacts");
  const url = new URL(request.url);
  const contacts = await getLandlordContactsList(user.userId);
  const filteredContacts = sortLandlordContacts(
    filterLandlordContacts(contacts, {
      query: firstParam(url.searchParams.get("q")),
      source: firstParam(url.searchParams.get("source")),
      role: firstParam(url.searchParams.get("role")),
      review: firstParam(url.searchParams.get("review")),
    }),
    (firstParam(url.searchParams.get("sort")) ?? "name") as ContactSortMode,
  );

  const csv = toCsv(
    [
      "Name",
      "Email",
      "System Role",
      "Assignment",
      "Scope",
      "Unit ID",
      "Sources",
      "Scope Type",
      "Permission Footprint",
      "Governance Flags",
      "Revocable",
      "Review Status",
      "Confidence Score",
      "Risk Level",
      "Attention Reason",
      "Recommended Action",
      "Notes",
      "Created At",
      "Updated At",
    ],
    contactCsvRows(filteredContacts),
  );

  return csvDownloadResponse(
    `homebase-contacts-${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
  );
}
