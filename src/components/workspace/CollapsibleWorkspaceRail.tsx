"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

export function CollapsibleWorkspaceRail({
  children,
  className = "",
  label = "Context menu",
  storageKey = "homebase.workspace.contextRailCollapsed"
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  storageKey?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) setCollapsed(stored === "true");
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, String(collapsed));
  }, [collapsed, storageKey]);

  return (
    <aside className={`${className} ${collapsed ? "xl:w-[58px]" : ""}`}>
      <div className={`xl:sticky xl:top-[132px] xl:h-[calc(100vh-148px)] ${collapsed ? "" : "xl:overflow-y-auto"}`}>
        <div className={`${collapsed ? "flex h-full flex-col items-center rounded-3xl border border-slate-200 bg-white p-2 shadow-sm" : "space-y-4"}`}>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 ${collapsed ? "h-10 w-10" : "mb-1 min-h-10 w-full gap-2 px-3"}`}
            aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
            title={collapsed ? `Expand ${label}` : `Collapse ${label}`}
          >
            {collapsed ? <PanelRightOpen size={16} /> : <><PanelRightClose size={16} /> Collapse {label}</>}
          </button>
          {collapsed ? (
            <div className="mt-3 flex flex-1 items-center justify-center">
              <p className="rotate-180 whitespace-nowrap text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 [writing-mode:vertical-rl]">{label}</p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </aside>
  );
}

