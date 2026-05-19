import { ReactNode } from "react";
import { inputClass, selectClass } from "@/components/admin/FormFields";

export function AdminListControls({
  searchPlaceholder = "Search...",
  defaultQuery = "",
  children
}: {
  searchPlaceholder?: string;
  defaultQuery?: string;
  children?: ReactNode;
}) {
  return (
    <form className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" action="" method="get">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input name="q" defaultValue={defaultQuery} className={inputClass} placeholder={searchPlaceholder} />
        <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800" type="submit">Search</button>
      </div>
      {children ? <div className="mt-3 grid gap-3 md:grid-cols-3">{children}</div> : null}
    </form>
  );
}

export function FilterSelect({ name, defaultValue = "", label, options }: { name: string; defaultValue?: string; label: string; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <select name={name} defaultValue={defaultValue} className={selectClass}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
