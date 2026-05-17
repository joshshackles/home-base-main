import { UnitStatus } from "@prisma/client";
import { createLandlordUnit, updateLandlordUnit } from "@/app/landlord/actions";
import { Field, inputClass, SecondaryLink, selectClass, SubmitButton, textareaClass } from "@/components/admin/FormFields";

type PropertyOption = {
  id: string;
  name: string;
  city: string;
  state: string;
};

type TenantOption = {
  id: string;
  name: string | null;
  email: string;
};

type ApplicationOption = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  status: string;
};

type LandlordUnitFormProps = {
  properties: PropertyOption[];
  tenants?: TenantOption[];
  applications?: ApplicationOption[];
  unit?: {
    id: string;
    propertyId: string;
    unitNumber: string;
    tenantUserId: string | null;
    currentApplicationId: string | null;
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
    clientNotes: string | null;
    importantContacts: string | null;
  };
};

const landlordStatuses = [UnitStatus.AVAILABLE, UnitStatus.PENDING, UnitStatus.OCCUPIED, UnitStatus.UNAVAILABLE];

function optionLabel(name: string | null, email: string) {
  return name ? `${name} (${email})` : email;
}

export function LandlordUnitForm({ properties, tenants = [], applications = [], unit }: LandlordUnitFormProps) {
  const action = unit ? updateLandlordUnit : createLandlordUnit;

  return (
    <form action={action} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {unit ? <input type="hidden" name="id" value={unit.id} /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Property">
          <select name="propertyId" required defaultValue={unit?.propertyId ?? ""} className={selectClass}>
            <option value="" disabled>Select a property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name} - {property.city}, {property.state}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit number">
          <input name="unitNumber" required defaultValue={unit?.unitNumber ?? ""} className={inputClass} placeholder="101" />
        </Field>
        <Field label="Status">
          <select name="status" required defaultValue={unit?.status === UnitStatus.ARCHIVED ? UnitStatus.UNAVAILABLE : unit?.status ?? UnitStatus.AVAILABLE} className={selectClass}>
            {landlordStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </Field>
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          <p className="font-black">Public directory rule</p>
          <p>Units marked AVAILABLE are automatically listed in the marketplace. Any other status keeps the unit private.</p>
        </div>
        <Field label="Bedrooms">
          <input name="bedrooms" required type="number" min="0" step="1" defaultValue={unit?.bedrooms ?? 1} className={inputClass} />
        </Field>
        <Field label="Bathrooms">
          <input name="bathrooms" required type="number" min="0" step="0.5" defaultValue={unit?.bathrooms ?? 1} className={inputClass} />
        </Field>
        <Field label="Monthly rent">
          <input name="rentAmount" required type="number" min="0" step="1" defaultValue={unit?.rentAmount ?? ""} className={inputClass} />
        </Field>
        <Field label="Deposit">
          <input name="deposit" type="number" min="0" step="1" defaultValue={unit?.deposit ?? ""} className={inputClass} />
        </Field>
        <Field label="Square feet">
          <input name="squareFeet" type="number" min="0" step="1" defaultValue={unit?.squareFeet ?? ""} className={inputClass} />
        </Field>
        <div className="rounded-2xl bg-brand-50 p-4 md:col-span-2">
          <label className="flex items-start gap-3 text-sm font-semibold text-brand-900">
            <input type="checkbox" name="voucherFriendly" defaultChecked={unit?.voucherFriendly ?? false} className="mt-1 h-4 w-4 rounded border-slate-300" />
            <span>
              Voucher-friendly listing
              <span className="block pt-1 text-xs font-normal leading-5 text-brand-900/70">Use this when the unit is open to voucher-assisted applicants.</span>
            </span>
          </label>
        </div>
        <Field label="Utilities note">
          <textarea name="utilitiesNote" defaultValue={unit?.utilitiesNote ?? ""} className={textareaClass} />
        </Field>
        <Field label="Pet policy">
          <textarea name="petPolicy" defaultValue={unit?.petPolicy ?? ""} className={textareaClass} />
        </Field>
        <Field label="Accessibility notes">
          <textarea name="accessibility" defaultValue={unit?.accessibility ?? ""} className={textareaClass} />
        </Field>
        <Field label="Unit description">
          <textarea name="description" defaultValue={unit?.description ?? ""} className={textareaClass} />
        </Field>
        <Field label="Assigned tenant" help="Link the unit to an active applicant or tenant account when someone is occupying it.">
          <select name="tenantUserId" defaultValue={unit?.tenantUserId ?? ""} className={selectClass}>
            <option value="">No tenant assigned</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{optionLabel(tenant.name, tenant.email)}</option>
            ))}
          </select>
        </Field>
        <Field label="Current application" help="Connects messages, lease packets, repairs, and ledger activity to the tenant workflow.">
          <select name="currentApplicationId" defaultValue={unit?.currentApplicationId ?? ""} className={selectClass}>
            <option value="">No application linked</option>
            {applications.map((application) => (
              <option key={application.id} value={application.id}>{application.applicantName} - {application.status}</option>
            ))}
          </select>
        </Field>
        <Field label="Important contacts">
          <textarea name="importantContacts" defaultValue={unit?.importantContacts ?? ""} className={textareaClass} placeholder="Case worker, emergency contact, property contact, preferred vendor..." />
        </Field>
        <Field label="Client notes">
          <textarea name="clientNotes" defaultValue={unit?.clientNotes ?? ""} className={textareaClass} placeholder="Private landlord notes about tenant preferences, communication history, or support details." />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton>{unit ? "Save Unit" : "Create Unit"}</SubmitButton>
        <SecondaryLink href="/landlord/units">Cancel</SecondaryLink>
      </div>
    </form>
  );
}
