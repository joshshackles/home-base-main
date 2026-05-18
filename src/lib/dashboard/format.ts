export function humanStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusTone(value: string): "slate" | "blue" | "green" | "amber" | "red" {
  const status = value.toUpperCase();
  if (["APPROVED", "PAID", "COMPLETED", "ACTIVE", "AVAILABLE", "SUCCEEDED"].includes(status)) return "green";
  if (["PENDING", "UNDER_REVIEW", "SCHEDULED", "PROCESSING"].includes(status)) return "amber";
  if (["DECLINED", "FAILED", "VOIDED", "CANCELLED", "REJECTED"].includes(status)) return "red";
  if (["NEW", "STARTED", "SUBMITTED"].includes(status)) return "blue";
  return "slate";
}

export function compactCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}
