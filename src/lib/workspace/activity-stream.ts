import {
  getWorkspaceEventDefinition,
  shouldWorkspaceEventCreateTimelineItem,
  workspaceEventToActivityItem,
  workspaceEventTypes,
  type WorkspaceEventType
} from "@/lib/workspace/event-registry";
import type {
  WorkspaceActivityGroup,
  WorkspaceActivityItem,
  WorkspaceActivityStream,
  WorkspaceEntityRef,
  WorkspaceEntityType,
  WorkspaceEvent,
  WorkspaceEventAudience,
  WorkspaceEventCategory,
  WorkspaceEventSeverity
} from "@/lib/workspace/types";

export type WorkspaceActivityStreamInput = {
  events: WorkspaceEvent[];
  entity?: WorkspaceEntityRef;
  includeRelatedEntities?: boolean;
  audience?: WorkspaceEventAudience;
  categories?: WorkspaceEventCategory[];
  severities?: WorkspaceEventSeverity[];
  entityTypes?: WorkspaceEntityType[];
  includeSensitive?: boolean;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
  newestFirst?: boolean;
};

export function buildWorkspaceActivityStream(input: WorkspaceActivityStreamInput): WorkspaceActivityStream {
  const newestFirst = input.newestFirst ?? true;
  const offset = Math.max(input.offset ?? 0, 0);
  const limit = input.limit && input.limit > 0 ? input.limit : undefined;
  const timelineEvents = input.events.filter((event) => isTimelineEvent(event));
  const filteredEvents = timelineEvents.filter((event) => matchesActivityStreamFilters(event, input));
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const delta = a.occurredAt.getTime() - b.occurredAt.getTime();
    return newestFirst ? -delta : delta;
  });
  const windowedEvents = limit ? sortedEvents.slice(offset, offset + limit) : sortedEvents.slice(offset);
  const items = windowedEvents.map(workspaceEventToActivityItem);

  return {
    items,
    groups: groupWorkspaceActivityItemsByDay(items),
    totalCount: timelineEvents.length,
    visibleCount: items.length,
    filteredCount: filteredEvents.length,
    newestAt: getNewestDate(filteredEvents),
    oldestAt: getOldestDate(filteredEvents),
    hasMore: limit ? offset + limit < filteredEvents.length : false,
    countsBySeverity: countWorkspaceEventsBy(filteredEvents, (event) => event.severity ?? "info"),
    countsByCategory: countWorkspaceEventsBy(filteredEvents, (event) => event.category ?? getKnownCategory(event))
  };
}

export function groupWorkspaceActivityItemsByDay(items: WorkspaceActivityItem[]): WorkspaceActivityGroup[] {
  const groups = items.reduce(
    (index, item) => {
      const key = item.occurredAt.toISOString().slice(0, 10);
      index[key] = [...(index[key] ?? []), item];
      return index;
    },
    {} as Record<string, WorkspaceActivityItem[]>
  );

  return Object.entries(groups).map(([date, groupItems]) => ({
    key: date,
    date,
    label: formatActivityGroupLabel(date),
    items: groupItems
  }));
}

export function getWorkspaceActivityPreview(events: WorkspaceEvent[], limit = 5): WorkspaceActivityItem[] {
  return buildWorkspaceActivityStream({ events, limit }).items;
}

export function filterWorkspaceActivityByEntity(
  events: WorkspaceEvent[],
  entity: WorkspaceEntityRef,
  options?: Pick<WorkspaceActivityStreamInput, "includeRelatedEntities" | "audience" | "includeSensitive">
): WorkspaceEvent[] {
  return buildWorkspaceActivityStream({
    events,
    entity,
    includeRelatedEntities: options?.includeRelatedEntities ?? true,
    audience: options?.audience,
    includeSensitive: options?.includeSensitive
  }).items.map((item) => {
    const matched = events.find((event) => (event.id && event.id === item.id) || workspaceEventToActivityItem(event).id === item.id);
    return matched;
  }).filter((event): event is WorkspaceEvent => Boolean(event));
}

function matchesActivityStreamFilters(event: WorkspaceEvent, input: WorkspaceActivityStreamInput): boolean {
  if (input.entity && !matchesEntityFilter(event, input.entity, input.includeRelatedEntities ?? true)) {
    return false;
  }

  if (input.audience && !matchesAudienceFilter(event, input.audience)) {
    return false;
  }

  if (input.categories?.length && !input.categories.includes(event.category ?? getKnownCategory(event))) {
    return false;
  }

  if (input.severities?.length && !input.severities.includes(event.severity ?? "info")) {
    return false;
  }

  if (input.entityTypes?.length && !input.entityTypes.includes(event.entity.type)) {
    return false;
  }

  if (!input.includeSensitive && isSensitiveActivityEvent(event)) {
    return false;
  }

  if (input.from && event.occurredAt < input.from) {
    return false;
  }

  if (input.to && event.occurredAt > input.to) {
    return false;
  }

  return true;
}

function matchesEntityFilter(event: WorkspaceEvent, entity: WorkspaceEntityRef, includeRelatedEntities: boolean): boolean {
  if (event.entity.type === entity.type && event.entity.id === entity.id) {
    return true;
  }

  if (!includeRelatedEntities) {
    return false;
  }

  return Boolean(event.relatedEntities?.some((related) => related.type === entity.type && related.id === entity.id));
}

function matchesAudienceFilter(event: WorkspaceEvent, audience: WorkspaceEventAudience): boolean {
  if (event.audience?.length) {
    return event.audience.includes(audience) || event.audience.includes("system");
  }

  return getKnownAudiences(event).includes(audience);
}

function isTimelineEvent(event: WorkspaceEvent): boolean {
  if (!isKnownEvent(event)) {
    return true;
  }

  return shouldWorkspaceEventCreateTimelineItem(event.type);
}

function isSensitiveActivityEvent(event: WorkspaceEvent): boolean {
  if (!isKnownEvent(event)) {
    return false;
  }

  return getWorkspaceEventDefinition(event.type).sensitive ?? false;
}

function getKnownCategory(event: WorkspaceEvent): WorkspaceEventCategory {
  if (isKnownEvent(event)) {
    return getWorkspaceEventDefinition(event.type).category;
  }

  return event.category ?? "admin";
}

function getKnownAudiences(event: WorkspaceEvent): WorkspaceEventAudience[] {
  if (isKnownEvent(event)) {
    return getWorkspaceEventDefinition(event.type).audiences;
  }

  return event.audience ?? ["admin"];
}

function isKnownEvent(event: WorkspaceEvent): event is WorkspaceEvent & { type: WorkspaceEventType } {
  return workspaceEventTypes.includes(event.type as WorkspaceEventType);
}

function getNewestDate(events: WorkspaceEvent[]): Date | undefined {
  return events.reduce<Date | undefined>((newest, event) => {
    if (!newest || event.occurredAt > newest) {
      return event.occurredAt;
    }

    return newest;
  }, undefined);
}

function getOldestDate(events: WorkspaceEvent[]): Date | undefined {
  return events.reduce<Date | undefined>((oldest, event) => {
    if (!oldest || event.occurredAt < oldest) {
      return event.occurredAt;
    }

    return oldest;
  }, undefined);
}

function countWorkspaceEventsBy<T extends string>(events: WorkspaceEvent[], getKey: (event: WorkspaceEvent) => T): Partial<Record<T, number>> {
  return events.reduce(
    (counts, event) => {
      const key = getKey(event);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    },
    {} as Partial<Record<T, number>>
  );
}

function formatActivityGroupLabel(date: string): string {
  const activityDate = new Date(`${date}T00:00:00.000Z`);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (date === todayKey) {
    return "Today";
  }

  if (date === yesterdayKey) {
    return "Yesterday";
  }

  return activityDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: activityDate.getUTCFullYear() === today.getUTCFullYear() ? undefined : "numeric",
    timeZone: "UTC"
  });
}
