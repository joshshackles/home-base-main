import Link from "next/link";
import { FileText, RefreshCw, ShieldAlert, Wand2 } from "lucide-react";
import type { DocumentTemplate, DocumentTemplateVersion, GeneratedDocument } from "@prisma/client";
import { GeneratedDocumentOutputFormat, GeneratedDocumentTemplateType, RelatedDocumentRecordType } from "@prisma/client";
import { CommandCenterButton, CommandCenterMetric, CommandCenterPanel, CommandCenterSurface } from "@/components/ui/CommandCenterPrimitives";

type TemplateWithVersion = DocumentTemplate & { versions: DocumentTemplateVersion[] };

export function DocumentGenerationWorkspace({
  templates,
  generatedDocuments,
  generateAction
}: {
  templates: TemplateWithVersion[];
  generatedDocuments: GeneratedDocument[];
  generateAction: (formData: FormData) => Promise<void>;
}) {
  const leaseTemplate = templates.find((template) => template.templateType === GeneratedDocumentTemplateType.LEASE);
  const reportTemplates = templates.filter((template) => template.templateType !== GeneratedDocumentTemplateType.LEASE);

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
      <CommandCenterPanel title="Templates" detail="Published document and report definitions." actionHref="/api/document-generation/templates" actionLabel="API">
        <div className="grid gap-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-black text-slate-950">{template.name}</p>
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{template.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">{template.templateType.replaceAll("_", " ")}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">v{template.versions[0]?.versionNumber ?? 1}</span>
              </div>
            </div>
          ))}
        </div>
      </CommandCenterPanel>

      <CommandCenterSurface>
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Generation workspace</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Lease and report builder</h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-600">Generate previews, drafts, final PDFs, CSV exports, and saved archive records from shared backend data builders.</p>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <GenerationCard
            title="Generated Lease Draft"
            detail="Create a template-driven lease draft from an application or unit. Missing legal or property fields are detected before finalization."
            templateId={leaseTemplate?.id}
            templateType={GeneratedDocumentTemplateType.LEASE}
            outputFormat={GeneratedDocumentOutputFormat.PDF}
            relatedRecordType={RelatedDocumentRecordType.PORTFOLIO}
            generateAction={generateAction}
            finalizeLabel="Generate draft"
          />
          {reportTemplates.slice(0, 6).map((template) => (
            <GenerationCard
              key={template.id}
              title={template.name}
              detail={template.description ?? "Generate a saved report from the current portfolio data."}
              templateId={template.id}
              templateType={template.templateType}
              outputFormat={template.defaultOutputFormat}
              relatedRecordType={RelatedDocumentRecordType.PORTFOLIO}
              generateAction={generateAction}
              finalizeLabel={template.defaultOutputFormat === "CSV" ? "Export CSV" : "Generate report"}
            />
          ))}
        </div>
      </CommandCenterSurface>

      <div className="grid gap-4">
        <MissingFieldsPanel />
        <GeneratedDocumentsArchive generatedDocuments={generatedDocuments} />
      </div>
    </div>
  );
}

function GenerationCard({
  title,
  detail,
  templateId,
  templateType,
  outputFormat,
  relatedRecordType,
  generateAction,
  finalizeLabel
}: {
  title: string;
  detail: string;
  templateId?: string;
  templateType: GeneratedDocumentTemplateType;
  outputFormat: GeneratedDocumentOutputFormat;
  relatedRecordType: RelatedDocumentRecordType;
  generateAction: (formData: FormData) => Promise<void>;
  finalizeLabel: string;
}) {
  return (
    <form action={generateAction} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="templateType" value={templateType} />
      <input type="hidden" name="templateId" value={templateId ?? ""} />
      <input type="hidden" name="outputFormat" value={outputFormat} />
      <input type="hidden" name="relatedRecordType" value={relatedRecordType} />
      <input type="hidden" name="finalize" value="false" />
      <div className="flex gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><FileText size={20} /></span>
        <div className="min-w-0">
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{detail}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
          From
          <input name="from" type="date" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold normal-case text-slate-900" />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
          To
          <input name="to" type="date" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold normal-case text-slate-900" />
        </label>
      </div>
      <button className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700">
        <Wand2 size={16} /> {finalizeLabel}
      </button>
    </form>
  );
}

function MissingFieldsPanel() {
  return (
    <CommandCenterPanel title="Missing fields" detail="When a preview detects gaps, users should fix source records without losing builder context.">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 shrink-0 text-amber-700" size={18} />
          <p>Final generation is blocked when required fields are missing. Lease drafts also show a legal-review warning for state-specific terms.</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        <CommandCenterMetric label="Validation" value="Required" detail="Preview allowed, finalize guarded" />
        <CommandCenterMetric label="Edit model" value="Contextual" detail="Source-record edits stay linked" />
      </div>
    </CommandCenterPanel>
  );
}

function GeneratedDocumentsArchive({ generatedDocuments }: { generatedDocuments: GeneratedDocument[] }) {
  return (
    <CommandCenterPanel title="Generated archive" detail="Saved generated documents keep template version, source snapshot, missing fields, and status.">
      <div className="grid gap-2">
        {generatedDocuments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">Generated leases and reports will appear here after the first document is created.</div>
        ) : generatedDocuments.slice(0, 8).map((document) => (
          <div key={document.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="truncate text-sm font-black text-slate-950">{document.title}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">{document.documentType.replaceAll("_", " ")} / {document.status}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {document.fileUrl ? <Link href={document.fileUrl} className="text-xs font-black text-blue-700 hover:text-blue-900">Download</Link> : null}
              <span className="inline-flex items-center gap-1 text-xs font-black text-slate-500"><RefreshCw size={12} />Regenerate ready</span>
            </div>
          </div>
        ))}
      </div>
    </CommandCenterPanel>
  );
}
