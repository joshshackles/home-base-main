import type { ReactNode } from "react";
import { Grip, PanelRightOpen, Rows3, ScanLine } from "lucide-react";
import type { WorkspaceOperationalCanvasModel, WorkspaceDensityMode } from "@/lib/workspace";

type CanvasProps = {
  canvas: WorkspaceOperationalCanvasModel;
  header?: ReactNode;
  workflowNav?: ReactNode;
  primary?: ReactNode;
  context?: ReactNode;
  utilities?: ReactNode;
  className?: string;
};

const densityLabels: Record<WorkspaceDensityMode, string> = {
  analyst: "Analyst",
  command_center: "Command Center",
  comfortable: "Comfortable",
  operational: "Operational"
};

export function OperationalCanvas({ canvas, header, workflowNav, primary, context, utilities, className = "" }: CanvasProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(15, 23, 42, 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.035) 1px, transparent 1px)",
        backgroundSize: `${Math.max(canvas.snapGrid.gutter * 2, 16)}px ${Math.max(canvas.snapGrid.rowHeight / 2, 24)}px`
      }}
    >
      <div className="border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Operational canvas</p>
            <h2 className="mt-1 truncate text-lg font-black tracking-tight text-slate-950">{canvas.template.label}</h2>
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{canvas.template.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"><ScanLine size={13} />{densityLabels[canvas.density]}</span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"><Rows3 size={13} />{canvas.snapGrid.columns} cols</span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"><Grip size={13} />{canvas.modules.length} modules</span>
          </div>
        </div>
        {header ? <div className="mt-3">{header}</div> : null}
      </div>

      <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
        <aside className="border-b border-slate-200 bg-slate-950/95 p-3 text-white lg:border-b-0 lg:border-r lg:border-slate-800">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Workflow navigation</div>
          <div className="mt-3">{workflowNav}</div>
        </aside>

        <div className="min-w-0 p-3 lg:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Primary canvas</p>
            <p className="hidden text-xs font-semibold text-slate-500 sm:block">Snap grid: {canvas.snapGrid.rowHeight}px rows / {canvas.snapGrid.gutter}px gutter</p>
          </div>
          <div className="min-h-[420px] rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
            {primary}
          </div>
        </div>

        <aside className="border-t border-slate-200 bg-white/90 p-3 lg:border-l lg:border-t-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Context</p>
            <PanelRightOpen size={16} className="text-slate-400" />
          </div>
          {context}
        </aside>
      </div>

      {utilities ? <div className="border-t border-slate-200 bg-slate-50/90 p-3">{utilities}</div> : null}
    </section>
  );
}

export function OperationalCanvasModuleMap({ canvas }: { canvas: WorkspaceOperationalCanvasModel }) {
  return (
    <div className="grid gap-2">
      {canvas.modules.slice(0, 10).map((module) => (
        <div key={module.key} className="rounded-lg border border-slate-200 bg-white/90 p-2">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-black text-slate-950">{module.label}</p>
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-600">{module.representation.replaceAll("_", " ")}</span>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">{module.region.replaceAll("_", " ")} / {module.defaultColumnSpan} x {module.defaultRowSpan}</p>
        </div>
      ))}
    </div>
  );
}

