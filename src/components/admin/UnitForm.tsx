import { RentalMarketingStatus, RentalPropertyType, UnitStatus } from "@prisma/client";
import { createUnit, updateUnit } from "@/app/admin/actions";
import { Field, inputClass, SecondaryLink, selectClass, SubmitButton, textareaClass } from "@/components/admin/FormFields";

type LandlordOption = { id: string; name: string | null; email: string };

type UnitFormProps = {
  landlords?: LandlordOption[];
  unit?: {
    id: string;
    propertyId: string;
    property: { name: string; addressLine: string; city: string; state: string; zip: string; description: string | null; ownerId: string | null };
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

const rentalTypeLabels: Record<RentalPropertyType, string> = {
  SINGLE_FAMILY: "Single-family home",
  DUPLEX: "Duplex",
  APARTMENT: "Apartment",
  MOBILE_HOME: "Mobile home",
  CONDO: "Condo",
  TOWNHOME: "Townhouse",
  ROOM: "Room",
  COMMERCIAL: "Commercial",
  OTHER: "Other"
};

export function UnitForm({ landlords = [], unit }: UnitFormProps) {
  const action = unit ? updateUnit : createUnit;
  const property = unit?.property;

  return (
    <form action={action} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {unit ? <input type="hidden" name="id" value={unit.id} /> : null}
      {unit ? <input type="hidden" name="propertyId" value={unit.propertyId} /> : null}

      <div className="mb-6 rounded-3xl border border-brand-100 bg-brand-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">Unified rental record</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Address, rental type, pricing, and listing details now live together.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">HomeBase still keeps an internal property group for compatibility, but users create and edit one rental record instead of bouncing between separate property and unit screens.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Rental name">
          <input name="propertyName" required defaultValue={property?.name ?? ""} className={inputClass} placeholder="123 Main St, Aspen Park 4B, or South Joplin Home" />
        </Field>
        <Field label="Rental number/name">
          <input name="unitNumber" required defaultValue={unit?.unitNumber ?? "Main"} className={inputClass} placeholder="Main, 101, 4B, Suite A" />
        </Field>
        <Field label="Street address">
          <input name="addressLine" required defaultValue={property?.addressLine ?? ""} className={inputClass} placeholder="1000 Example Drive" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_0.45fr_0.7fr]">
          <Field label="City"><input name="city" required defaultValue={property?.city ?? ""} className={inputClass} placeholder="Joplin" /></Field>
          <Field label="State"><input name="state" required maxLength={2} defaultValue={property?.state ?? "MO"} className={inputClass} placeholder="MO" /></Field>
          <Field label="ZIP"><input name="zip" required defaultValue={property?.zip ?? ""} className={inputClass} placeholder="64801" /></Field>
        </div>
        <Field label="Rental type">
          <select name="rentalType" defaultValue={unit?.rentalType ?? RentalPropertyType.SINGLE_FAMILY} className={selectClass}>
            {Object.values(RentalPropertyType).map((type) => <option key={type} value={type}>{rentalTypeLabels[type]}</option>)}
          </select>
        </Field>
        <Field label="Marketing status">
          <select name="marketingStatus" defaultValue={unit?.marketingStatus ?? RentalMarketingStatus.ACTIVE} className={selectClass}>
            {Object.values(RentalMarketingStatus).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Landlord / owner" help="Optional admin assignment for this rental.">
          <select name="ownerId" defaultValue={property?.ownerId ?? ""} className={selectClass}>
            <option value="">Unassigned</option>
            {landlords.map((landlord) => <option key={landlord.id} value={landlord.id}>{landlord.name || landlord.email} ({landlord.email})</option>)}
          </select>
        </Field>
        <Field label="Marketplace headline">
          <input name="marketingHeadline" defaultValue={unit?.marketingHeadline ?? ""} className={inputClass} placeholder="Bright 2-bed near downtown" />
        </Field>
        <Field label="Bedrooms"><input name="bedrooms" required type="number" min="0" step="1" defaultValue={unit?.bedrooms ?? 1} className={inputClass} /></Field>
        <Field label="Bathrooms"><input name="bathrooms" required type="number" min="0" step="0.5" defaultValue={unit?.bathrooms ?? 1} className={inputClass} /></Field>
        <Field label="Monthly rent"><input name="rentAmount" required type="number" min="0" step="1" defaultValue={unit?.rentAmount ?? ""} className={inputClass} placeholder="733" /></Field>
        <Field label="Deposit"><input name="deposit" type="number" min="0" step="1" defaultValue={unit?.deposit ?? ""} className={inputClass} placeholder="500" /></Field>
        <Field label="Square feet"><input name="squareFeet" type="number" min="0" step="1" defaultValue={unit?.squareFeet ?? ""} className={inputClass} placeholder="850" /></Field>
        <Field label="Status"><select name="status" required defaultValue={unit?.status ?? UnitStatus.AVAILABLE} className={selectClass}>{Object.values(UnitStatus).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></Field>
        <div className="md:col-span-2 rounded-2xl bg-brand-50 p-4"><label className="flex items-start gap-3 text-sm font-semibold text-brand-900"><input type="checkbox" name="voucherFriendly" defaultChecked={unit?.voucherFriendly ?? false} className="mt-1 h-4 w-4 rounded border-slate-300" /><span>Voucher-friendly listing<span className="block pt-1 text-xs font-normal leading-5 text-brand-900/70">This makes the listing easy to identify in the marketplace and admin tables.</span></span></label></div>
        <Field label="Utilities note"><textarea name="utilitiesNote" defaultValue={unit?.utilitiesNote ?? ""} className={textareaClass} placeholder="Tenant pays electric. Water included." /></Field>
        <Field label="Pet policy"><textarea name="petPolicy" defaultValue={unit?.petPolicy ?? ""} className={textareaClass} placeholder="Pets considered with approval." /></Field>
        <Field label="Accessibility notes"><textarea name="accessibility" defaultValue={unit?.accessibility ?? ""} className={textareaClass} placeholder="Ground-floor unit, ramp access, wide doorway notes, etc." /></Field>
        <Field label="Marketing highlights"><textarea name="marketingHighlights" defaultValue={unit?.marketingHighlights ?? ""} className={textareaClass} placeholder="Short real-estate style highlights shown on marketplace cards." /></Field>
        <Field label="Rental description"><textarea name="description" defaultValue={unit?.description ?? property?.description ?? ""} className={textareaClass} placeholder="Describe the rental layout, condition, parking, or nearby features." /></Field>
        <Field label="Virtual tour URL"><input name="virtualTourUrl" defaultValue={unit?.virtualTourUrl ?? ""} className={inputClass} placeholder="https://..." /></Field>
        <Field label="Video tour URL"><input name="videoTourUrl" defaultValue={unit?.videoTourUrl ?? ""} className={inputClass} placeholder="https://..." /></Field>
        <Field label="Walk score"><input name="walkScore" type="number" min="0" max="100" defaultValue={unit?.walkScore ?? ""} className={inputClass} /></Field>
        <Field label="Transit score"><input name="transitScore" type="number" min="0" max="100" defaultValue={unit?.transitScore ?? ""} className={inputClass} /></Field>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton>{unit ? "Save Rental" : "Create Rental"}</SubmitButton>
        <SecondaryLink href="/admin/rentals">Cancel</SecondaryLink>
      </div>
    </form>
  );
}
