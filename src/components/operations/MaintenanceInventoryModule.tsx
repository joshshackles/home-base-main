import type { ReactNode } from "react";
import { MaintenanceAssetStatus, MaintenanceAssetType } from "@prisma/client";
import { OperationsModuleView, money, unitLabel } from "@/components/operations/OperationsModuleView";
import { titleCase } from "@/lib/operations/modules";

type InventoryData = Awaited<ReturnType<typeof import("@/lib/operations/modules").getMaintenanceInventoryModule>>;
type InventoryActions = {
  createAsset: (formData: FormData) => Promise<void>;
  createServiceRecord: (formData: FormData) => Promise<void>;
  createWarranty: (formData: FormData) => Promise<void>;
  createKeyLock: (formData: FormData) => Promise<void>;
};

const inputClass = "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
const labelClass = "text-xs font-black uppercase tracking-wide text-slate-500";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={labelClass}>{label}{children}</label>;
}

function SelectAsset({ assets, name = "assetId", keyLockOnly = false }: { assets: InventoryData["assets"]; name?: string; keyLockOnly?: boolean }) {
  const options = keyLockOnly ? assets.filter((asset) => asset.type === MaintenanceAssetType.KEY || asset.type === MaintenanceAssetType.LOCK) : assets;
  return (
    <select name={name} required className={inputClass}>
      <option value="">Choose asset</option>
      {options.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} — {titleCase(asset.type)}</option>)}
    </select>
  );
}

function DateInput({ name }: { name: string }) {
  return <input name={name} type="date" className={inputClass} />;
}

function ModuleForms({ data, actions, scope }: { data: InventoryData; actions: InventoryActions; scope: "admin" | "landlord" }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <form action={actions.createAsset} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Add asset</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Register appliances, HVAC, water heaters, keys, locks, roofs, electrical, plumbing, and security assets.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Asset name"><input name="name" required className={inputClass} placeholder="HVAC condenser, Fridge, Front door key" /></Field>
          <Field label="Type"><select name="type" className={inputClass}>{Object.values(MaintenanceAssetType).map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></Field>
          <Field label="Status"><select name="status" className={inputClass}>{Object.values(MaintenanceAssetStatus).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></Field>
          <Field label="Rental"><select name="unitId" className={inputClass}><option value="">Portfolio / property-level</option>{data.units.map((unit) => <option key={unit.id} value={unit.id}>{unitLabel(unit)}</option>)}</select></Field>
          <Field label="Make"><input name="make" className={inputClass} placeholder="Whirlpool, Trane, Schlage" /></Field>
          <Field label="Model"><input name="model" className={inputClass} placeholder="Model number" /></Field>
          <Field label="Serial number"><input name="serialNumber" className={inputClass} placeholder="Serial / tag / QR code" /></Field>
          <Field label="Location"><input name="location" className={inputClass} placeholder="Kitchen, roof, utility closet" /></Field>
          <Field label="Installed"><DateInput name="installedAt" /></Field>
          <Field label="Warranty expires"><DateInput name="warrantyExpiresAt" /></Field>
          <Field label="Next service due"><DateInput name="nextServiceDueAt" /></Field>
          <Field label="Notes"><textarea name="notes" className={`${inputClass} min-h-24`} placeholder="Access notes, filter size, lockset details, warranty coverage" /></Field>
        </div>
        <button className="mt-4 rounded-2xl bg-blue-700 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-blue-800">Save asset</button>
      </form>

      <form action={actions.createServiceRecord} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Log service history</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Attach vendor work, costs, and next service dates to the asset record.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Asset"><SelectAsset assets={data.assets} /></Field>
          <Field label="Service date"><DateInput name="serviceDate" /></Field>
          <Field label="Vendor"><input name="vendorName" className={inputClass} placeholder="Vendor or technician" /></Field>
          <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" /></Field>
          <Field label="Next service due"><DateInput name="nextServiceDueAt" /></Field>
          <Field label="Summary"><textarea name="summary" required className={`${inputClass} min-h-24`} placeholder="What was repaired, replaced, inspected, or recommended?" /></Field>
        </div>
        <button className="mt-4 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800">Log service</button>
      </form>

      <form action={actions.createWarranty} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Attach warranty</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Track warranty providers, policy numbers, document links, coverage notes, and expiration dates.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Asset"><SelectAsset assets={data.assets} /></Field>
          <Field label="Provider"><input name="providerName" className={inputClass} placeholder="Manufacturer, home warranty, vendor" /></Field>
          <Field label="Policy / claim number"><input name="policyNumber" className={inputClass} /></Field>
          <Field label="Expires"><DateInput name="expiresAt" /></Field>
          <Field label="Document URL"><input name="documentUrl" className={inputClass} placeholder="https://..." /></Field>
          <Field label="Coverage notes"><textarea name="coverageNotes" className={`${inputClass} min-h-24`} placeholder="Parts, labor, exclusions, deductible" /></Field>
        </div>
        <button className="mt-4 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800">Save warranty</button>
      </form>

      <form action={actions.createKeyLock} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Track keys and locks</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Record issued keys, lock locations, key codes, returns, and access-control notes.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Key / lock asset"><SelectAsset assets={data.assets} keyLockOnly /></Field>
          <Field label="Lock location"><input name="lockLocation" className={inputClass} placeholder="Front door, mailbox, garage" /></Field>
          <Field label="Key code"><input name="keyCode" className={inputClass} placeholder="Code, tag, or copy number" /></Field>
          <Field label="Issued to"><input name="issuedTo" className={inputClass} placeholder="Tenant, vendor, staff" /></Field>
          <Field label="Issued"><DateInput name="issuedAt" /></Field>
          <Field label="Returned"><DateInput name="returnedAt" /></Field>
          <Field label="Notes"><textarea name="notes" className={`${inputClass} min-h-24`} placeholder="Access rules, rekey notes, missing key follow-up" /></Field>
        </div>
        <button className="mt-4 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800">Save key / lock</button>
        {!data.assets.some((asset) => [MaintenanceAssetType.KEY, MaintenanceAssetType.LOCK].includes(asset.type)) ? <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Create a Key or Lock asset first, then log issued keys or lock records here.</p> : null}
      </form>
    </div>
  );
}

export function MaintenanceInventoryModule({ data, actions, scope }: { data: InventoryData; actions: InventoryActions; scope: "admin" | "landlord" }) {
  return (
    <>
      <OperationsModuleView
        title="Maintenance inventory"
        eyebrow="Update 10"
        description="Track appliances, HVAC, keys, locks, warranties, serial numbers, service history, and upcoming service needs."
        metrics={[
          { label: "Assets", value: data.counts.assets },
          { label: "Needs service", value: data.counts.needsService, tone: data.counts.needsService ? "warn" : "good" },
          { label: "Warranties", value: data.counts.warranties },
          { label: "Keys / locks", value: data.counts.keys }
        ]}
        sections={[
          { title: "Asset register", empty: "No appliances, HVAC units, locks, keys, or warranty-tracked assets are registered yet.", rows: data.assets.map((item) => ({ title: item.name, subtitle: `${titleCase(item.type)} • ${unitLabel(item.unit)}`, meta: [item.make, item.model, item.serialNumber].filter(Boolean).join(" • ") || item.location || "No serial details", status: item.status })) },
          { title: "Service history", empty: "No service records have been logged yet.", rows: data.serviceRecords.map((item) => ({ title: item.asset.name, subtitle: item.summary, meta: `${titleCase(item.asset.type)}${item.vendorName ? ` • ${item.vendorName}` : ""}${item.costCents ? ` • ${money(item.costCents)}` : ""}`, status: "RECORDED" })) },
          { title: "Warranty expirations", empty: "No warranty records are attached yet.", rows: data.warranties.map((item) => ({ title: item.asset.name, subtitle: item.providerName ?? "Warranty provider not set", meta: item.expiresAt ? `Expires ${item.expiresAt.toLocaleDateString()}` : "No expiration date", status: item.expiresAt && item.expiresAt < new Date() ? "EXPIRED" : "CURRENT" })) },
          { title: "Keys and locks", empty: "No key or lock records have been logged yet.", rows: data.keyLocks.map((item) => ({ title: item.asset.name, subtitle: item.lockLocation ?? "Location not set", meta: item.issuedTo ? `Issued to ${item.issuedTo}` : "Not issued", status: item.returnedAt ? "RETURNED" : item.issuedAt ? "ISSUED" : "AVAILABLE" })) }
        ]}
      />
      <div className="px-4 pb-8 sm:px-6 lg:px-8"><ModuleForms data={data} actions={actions} scope={scope} /></div>
    </>
  );
}
