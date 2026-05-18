import { RentalMarketingStatus, RentalPropertyType, UnitStatus } from "@prisma/client";
import { createUnit, updateUnit } from "@/app/admin/actions";
import { Field, inputClass, SecondaryLink, selectClass, SubmitButton, textareaClass } from "@/components/admin/FormFields";

type PropertyOption = {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  state: string;
};

type UnitFormProps = {
  properties: PropertyOption[];
  unit?: {
    id: string;
    propertyId: string;
    unitNumber: string;
    rentalType?: RentalPropertyType;
    marketingStatus?: RentalMarketingStatus;
    marketingHeadline?: string | null;
    marketingHighlights?: string | null;
    virtualTourUrl?: string | null;
    videoTourUrl?: string | null;
    walkScore?: number | null;
    transitScore?: number | null;
    bedrooms: number;
    bathrooms: number;
    rentAmount: number;
    deposit: number | null;
    squareFeet: number | null;
    voucherFriendly: boolean;
    utilitiesNote: string | null;
    accessibility: string | null;
    petPolicy: string | null;
    status: UnitStatus;
    description: string | null;
  };
};

export function UnitForm({ properties, unit }: UnitFormProps) {
  const action = unit ? updateUnit : createUnit;

  return (
    <form action={action} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {unit ? <input type="hidden" name="id" value={unit.id} /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Property">
          <select name="propertyId" required defaultValue={unit?.propertyId ?? ""} className={selectClass}>
            <option value="" disabled>Select a property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name} — {property.city}, {property.state}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rental number/name">
          <input name="unitNumber" required defaultValue={unit?.unitNumber ?? ""} className={inputClass} placeholder="101, 4B, Main House, or Suite A" />
        </Field>
        <Field label="Rental type">
          <select name="rentalType" defaultValue={unit?.rentalType ?? RentalPropertyType.APARTMENT} className={selectClass}>
            {Object.values(RentalPropertyType).map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Marketing status">
          <select name="marketingStatus" defaultValue={unit?.marketingStatus ?? RentalMarketingStatus.ACTIVE} className={selectClass}>
            {Object.values(RentalMarketingStatus).map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Marketplace headline">
          <input name="marketingHeadline" defaultValue={unit?.marketingHeadline ?? ""} className={inputClass} placeholder="Bright 2-bed near downtown" />
        </Field>
        <Field label="Bedrooms">
          <input name="bedrooms" required type="number" min="0" step="1" defaultValue={unit?.bedrooms ?? 1} className={inputClass} />
        </Field>
        <Field label="Bathrooms">
          <input name="bathrooms" required type="number" min="0" step="0.5" defaultValue={unit?.bathrooms ?? 1} className={inputClass} />
        </Field>
        <Field label="Monthly rent">
          <input name="rentAmount" required type="number" min="0" step="1" defaultValue={unit?.rentAmount ?? ""} className={inputClass} placeholder="733" />
        </Field>
        <Field label="Deposit">
          <input name="deposit" type="number" min="0" step="1" defaultValue={unit?.deposit ?? ""} className={inputClass} placeholder="500" />
        </Field>
        <Field label="Square feet">
          <input name="squareFeet" type="number" min="0" step="1" defaultValue={unit?.squareFeet ?? ""} className={inputClass} placeholder="850" />
        </Field>
        <Field label="Status">
          <select name="status" required defaultValue={unit?.status ?? UnitStatus.AVAILABLE} className={selectClass}>
            {Object.values(UnitStatus).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2 rounded-2xl bg-brand-50 p-4">
          <label className="flex items-start gap-3 text-sm font-semibold text-brand-900">
            <input type="checkbox" name="voucherFriendly" defaultChecked={unit?.voucherFriendly ?? false} className="mt-1 h-4 w-4 rounded border-slate-300" />
            <span>
              Voucher-friendly listing
              <span className="block pt-1 text-xs font-normal leading-5 text-brand-900/70">This makes the listing easy to identify in the marketplace and admin tables.</span>
            </span>
          </label>
        </div>
        <Field label="Utilities note">
          <textarea name="utilitiesNote" defaultValue={unit?.utilitiesNote ?? ""} className={textareaClass} placeholder="Tenant pays electric. Water included." />
        </Field>
        <Field label="Pet policy">
          <textarea name="petPolicy" defaultValue={unit?.petPolicy ?? ""} className={textareaClass} placeholder="Pets considered with approval." />
        </Field>
        <Field label="Accessibility notes">
          <textarea name="accessibility" defaultValue={unit?.accessibility ?? ""} className={textareaClass} placeholder="Ground-floor unit, ramp access, wide doorway notes, etc." />
        </Field>
        <Field label="Marketing highlights">
          <textarea name="marketingHighlights" defaultValue={unit?.marketingHighlights ?? ""} className={textareaClass} placeholder="Short real-estate style highlights shown on marketplace cards." />
        </Field>
        <Field label="Rental description">
          <textarea name="description" defaultValue={unit?.description ?? ""} className={textareaClass} placeholder="Describe the rental layout, condition, parking, or nearby features." />
        </Field>
        <Field label="Virtual tour URL">
          <input name="virtualTourUrl" defaultValue={unit?.virtualTourUrl ?? ""} className={inputClass} placeholder="https://..." />
        </Field>
        <Field label="Video tour URL">
          <input name="videoTourUrl" defaultValue={unit?.videoTourUrl ?? ""} className={inputClass} placeholder="https://..." />
        </Field>
        <Field label="Walk score">
          <input name="walkScore" type="number" min="0" max="100" defaultValue={unit?.walkScore ?? ""} className={inputClass} />
        </Field>
        <Field label="Transit score">
          <input name="transitScore" type="number" min="0" max="100" defaultValue={unit?.transitScore ?? ""} className={inputClass} />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton>{unit ? "Save Rental" : "Create Rental"}</SubmitButton>
        <SecondaryLink href="/admin/rentals">Cancel</SecondaryLink>
      </div>
    </form>
  );
}
