export type CsvValue = string | number | boolean | Date | null | undefined;

function neutralizeSpreadsheetFormula(value: string) {
  const trimmed = value.trimStart();
  if (/^[=+\-@]/.test(trimmed)) return `'${value}`;
  return value;
}

export function csvEscape(value: CsvValue) {
  if (value === null || value === undefined) return "";
  const rawValue = value instanceof Date ? value.toISOString() : String(value);
  const raw = typeof value === "string" ? neutralizeSpreadsheetFormula(rawValue) : rawValue;
  const escaped = raw.replaceAll('"', '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function toCsv(headers: string[], rows: CsvValue[][]) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return `${lines.join("\n")}\n`;
}

export function csvDownloadResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
