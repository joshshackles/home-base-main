import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { GeneratedDocumentOutputFormat } from "@prisma/client";
import { toCsv } from "@/lib/csv";
import type { DocumentDataBuildResult } from "@/lib/document-generation/types";

function stringify(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function tableFromData(data: Record<string, unknown>) {
  const table = data.table as { headers?: string[]; rows?: Array<Array<string | number>> } | undefined;
  return {
    headers: table?.headers?.length ? table.headers : ["Field", "Value"],
    rows: table?.rows?.length ? table.rows : Object.entries(data).map(([key, value]) => [key, stringify(value)])
  };
}

export function renderHtmlPreview(result: DocumentDataBuildResult) {
  const data = result.data as Record<string, unknown>;
  const table = tableFromData(data);
  return [
    `<article class="generated-document-preview">`,
    `<h1>${result.suggestedDocumentTitle}</h1>`,
    `<p>${stringify((data.report as Record<string, unknown> | undefined)?.generatedAt ?? new Date().toISOString())}</p>`,
    result.warnings.length ? `<section><h2>Warnings</h2><ul>${result.warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul></section>` : "",
    result.missingFields.length ? `<section><h2>Missing fields</h2><ul>${result.missingFields.map((field) => `<li>${field.label}</li>`).join("")}</ul></section>` : "",
    `<table><thead><tr>${table.headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${stringify(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
    `</article>`
  ].join("");
}

export function renderCsv(result: DocumentDataBuildResult) {
  const table = tableFromData(result.data as Record<string, unknown>);
  return Buffer.from(toCsv(table.headers, table.rows), "utf8");
}

export async function renderPdf(result: DocumentDataBuildResult) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([612, 792]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const margin = 48;
  let y = 742;

  function drawLine(text: string, size = 10, isBold = false) {
    if (y < 60) {
      page = pdf.addPage([612, 792]);
      y = 742;
    }
    page.drawText(text.slice(0, 95), { x: margin, y, size, font: isBold ? bold : regular, color: rgb(0.05, 0.09, 0.18) });
    y -= size + 8;
  }

  drawLine(result.suggestedDocumentTitle, 20, true);
  drawLine(`Generated: ${new Date().toLocaleString()}`, 10);
  if (result.warnings.length) {
    y -= 8;
    drawLine("Warnings", 13, true);
    for (const warning of result.warnings) drawLine(`- ${warning}`, 9);
  }
  if (result.missingFields.length) {
    y -= 8;
    drawLine("Missing Required Fields", 13, true);
    for (const field of result.missingFields) drawLine(`- ${field.label} (${field.sourceRecord})`, 9);
  }
  y -= 8;
  const table = tableFromData(result.data as Record<string, unknown>);
  drawLine(table.headers.join(" | "), 9, true);
  for (const row of table.rows.slice(0, 120)) drawLine(row.map(stringify).join(" | "), 8);

  return Buffer.from(await pdf.save());
}

export async function renderGeneratedDocumentFile(result: DocumentDataBuildResult, outputFormat: GeneratedDocumentOutputFormat) {
  if (outputFormat === GeneratedDocumentOutputFormat.CSV) {
    return { buffer: renderCsv(result), mimeType: "text/csv", extension: "csv" };
  }
  if (outputFormat === GeneratedDocumentOutputFormat.HTML_PREVIEW) {
    return { buffer: Buffer.from(renderHtmlPreview(result), "utf8"), mimeType: "text/html", extension: "html" };
  }
  if (outputFormat === GeneratedDocumentOutputFormat.DOCX) {
    return { buffer: Buffer.from(renderHtmlPreview(result), "utf8"), mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx" };
  }
  if (outputFormat === GeneratedDocumentOutputFormat.XLSX) {
    return { buffer: renderCsv(result), mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx" };
  }
  return { buffer: await renderPdf(result), mimeType: "application/pdf", extension: "pdf" };
}
