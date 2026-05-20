// Compatibility facade. The canonical landlord inbox adapter lives in
// `src/lib/messaging/unified-landlord-inbox.ts` so lead, application,
// tenant, and maintenance messages share one permission-scoped thread shape.
export {
  buildUnifiedLandlordInbox as buildLandlordUnifiedInbox,
  filterUnifiedInboxThreads,
  selectedUnifiedInboxThreadId,
  unifiedInboxSourceLabel,
  unifiedInboxStatusLabel,
  type UnifiedInboxFilters,
  type UnifiedInboxMessage,
  type UnifiedInboxThread,
  type UnifiedLandlordInbox,
} from "@/lib/messaging/unified-landlord-inbox";

export function normalizeUnifiedInboxFilters(searchParams?: Record<string, string | string[] | undefined>) {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  return {
    q: first(searchParams?.q)?.trim() || undefined,
    source: first(searchParams?.source) || "all",
    scope: first(searchParams?.scope) || "all",
    sort: first(searchParams?.sort) || "needs-reply",
  };
}
