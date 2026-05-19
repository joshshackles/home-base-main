import type { ReactNode } from "react";

export function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-800">{label}</span>
      {children}
      {help ? <span className="mt-1 block text-xs leading-5 text-slate-500">{help}</span> : null}
    </label>
  );
}

export const inputClass = "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100";
export const textareaClass = `${inputClass} min-h-28 resize-y`;
export const selectClass = inputClass;

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button type="submit" className="rounded-2xl bg-brand-600 px-6 py-3 font-bold text-white shadow-sm hover:bg-brand-700">
      {children}
    </button>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-900 hover:bg-slate-50">
      {children}
    </a>
  );
}
