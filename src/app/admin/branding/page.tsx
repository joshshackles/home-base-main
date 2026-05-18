export const dynamic = "force-dynamic";

import { AdminBrandingThemeMode } from "@prisma/client";
import { saveAdminBrandingAction } from "@/app/admin/actions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OpsPanel } from "@/components/admin/ops/AdminOpsCards";
import { getBrandingSettings } from "@/lib/admin-ops";

export default async function AdminBrandingPage({ searchParams }: { searchParams?: { saved?: string } }) {
  const settings = await getBrandingSettings();

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Admin Studio"
        title="Branding & public identity"
        description="Control the product name, public homepage language, logo mark, color system, support contact, and launch toggles from one place."
      />

      {searchParams?.saved ? <p className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Brand settings saved and public surfaces revalidated.</p> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <OpsPanel title="Brand controls" eyebrow="Identity system">
          <form action={saveAdminBrandingAction} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" name="productName" defaultValue={settings.productName} />
              <Field label="Short name" name="shortName" defaultValue={settings.shortName} />
            </div>
            <Field label="Tagline" name="tagline" defaultValue={settings.tagline} />
            <Field label="Homepage headline" name="homepageHeadline" defaultValue={settings.homepageHeadline} />
            <label className="grid gap-1.5 text-sm font-bold text-slate-800">
              Homepage subheadline
              <textarea name="homepageSubheadline" defaultValue={settings.homepageSubheadline} rows={4} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Primary color" name="primaryColor" type="color" defaultValue={settings.primaryColor} />
              <Field label="Accent color" name="accentColor" type="color" defaultValue={settings.accentColor} />
              <Field label="Surface color" name="surfaceColor" type="color" defaultValue={settings.surfaceColor} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Logo mark text" name="logoMarkText" defaultValue={settings.logoMarkText} />
              <label className="grid gap-1.5 text-sm font-bold text-slate-800">
                Theme mode
                <select name="themeMode" defaultValue={settings.themeMode} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100">
                  {Object.values(AdminBrandingThemeMode).map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Logo URL" name="logoUrl" defaultValue={settings.logoUrl ?? ""} />
              <Field label="Favicon URL" name="faviconUrl" defaultValue={settings.faviconUrl ?? ""} />
            </div>
            <Field label="Support email" name="supportEmail" defaultValue={settings.supportEmail ?? ""} />
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4">
              <Toggle label="Public signup enabled" name="publicSignupEnabled" defaultChecked={settings.publicSignupEnabled} />
              <Toggle label="Marketplace enabled" name="marketplaceEnabled" defaultChecked={settings.marketplaceEnabled} />
            </div>
            <button type="submit" className="w-fit rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white hover:bg-brand-700">Save brand settings</button>
          </form>
        </OpsPanel>

        <aside className="space-y-5">
          <OpsPanel title="Live brand preview" eyebrow="Public face">
            <div className="rounded-[1.5rem] p-5 text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${settings.surfaceColor}, ${settings.primaryColor})` }}>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-black ring-1 ring-white/20">{settings.logoMarkText}</span>
                <div>
                  <p className="text-lg font-black">{settings.productName}</p>
                  <p className="text-xs font-semibold text-white/75">{settings.tagline}</p>
                </div>
              </div>
              <h2 className="mt-8 text-3xl font-black leading-tight">{settings.homepageHeadline}</h2>
              <p className="mt-3 text-sm leading-6 text-white/80">{settings.homepageSubheadline}</p>
              <div className="mt-5 flex gap-2">
                <span className="rounded-2xl bg-white px-4 py-2 text-xs font-black" style={{ color: settings.primaryColor }}>Get started</span>
                <span className="rounded-2xl border border-white/30 px-4 py-2 text-xs font-black text-white">View marketplace</span>
              </div>
            </div>
          </OpsPanel>
          <OpsPanel title="Brand checklist" eyebrow="Quality gates">
            <ul className="space-y-2 text-sm leading-6 text-slate-700">
              <li>• Keep one primary action color across public and private surfaces.</li>
              <li>• Use success/warning/danger colors only for state, not decoration.</li>
              <li>• Prefer a simple geometric mark that works at favicon size.</li>
              <li>• Keep public copy benefit-driven for both landlords and renters.</li>
            </ul>
          </OpsPanel>
        </aside>
      </div>
    </main>
  );
}

function Field({ label, name, defaultValue, type = "text" }: { label: string; name: string; defaultValue: string; type?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-800">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} className="h-12 rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
    </label>
  );
}

function Toggle({ label, name, defaultChecked }: { label: string; name: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-800">
      <span>{label}</span>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 rounded border-slate-300 text-brand-600" />
    </label>
  );
}
