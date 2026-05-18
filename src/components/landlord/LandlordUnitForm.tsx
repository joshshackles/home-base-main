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
    schoolDistrict: string | null;
    neighborhood: string | null;
    nearbyFeatures: string | null;
    yearBuilt: number | null;
    roofAgeYears: number | null;
    averageUtilityBill: number | null;
    parkingInfo: string | null;
    laundryInfo: string | null;
    appliancesIncluded: string | null;
    flooringInfo: string | null;
    yardInfo: string | null;
    smokingPolicy: string | null;
    leaseTermsNote: string | null;
    moveInFeesNote: string | null;
    rentDueDay: number | null;
    lateFeePolicy: string | null;
    previousTenantNotes: string | null;
    status: UnitStatus;
    description: string | null;
    clientNotes: string | null;
    importantContacts: string | null;
  };
};

const landlordStatuses = [UnitStatus.AVAILABLE, UnitStatus.PENDING, UnitStatus.OCCUPIED, UnitStatus.PENDING];

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
          <select name="status" required defaultValue={unit?.status === UnitStatus.ARCHIVED ? UnitStatus.PENDING : unit?.status ?? UnitStatus.AVAILABLE} className={selectClass}>
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
        <Field label="School district">
          <input name="schoolDistrict" defaultValue={unit?.schoolDistrict ?? ""} className={inputClass} placeholder="Joplin Schools" />
        </Field>
        <Field label="Neighborhood / area">
          <input name="neighborhood" defaultValue={unit?.neighborhood ?? ""} className={inputClass} placeholder="Eastmoreland, downtown, near hospital..." />
        </Field>
        <Field label="Year built">
          <input name="yearBuilt" type="number" min="1800" step="1" defaultValue={unit?.yearBuilt ?? ""} className={inputClass} />
        </Field>
        <Field label="Roof age">
          <input name="roofAgeYears" type="number" min="0" step="1" defaultValue={unit?.roofAgeYears ?? ""} className={inputClass} placeholder="Years" />
        </Field>
        <Field label="Average utility bill">
          <input name="averageUtilityBill" type="number" min="0" step="1" defaultValue={unit?.averageUtilityBill ?? ""} className={inputClass} />
        </Field>
        <Field label="Rent due day">
          <input name="rentDueDay" type="number" min="1" max="31" step="1" defaultValue={unit?.rentDueDay ?? ""} className={inputClass} placeholder="1" />
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
        <Field label="Nearby features">
          <textarea name="nearbyFeatures" defaultValue={unit?.nearbyFeatures ?? ""} className={textareaClass} placeholder="Bus routes, parks, grocery, medical, schools, employers..." />
        </Field>
        <Field label="Parking">
          <textarea name="parkingInfo" defaultValue={unit?.parkingInfo ?? ""} className={textareaClass} placeholder="Garage, driveway, street parking, assigned spaces..." />
        </Field>
        <Field label="Laundry">
          <textarea name="laundryInfo" defaultValue={unit?.laundryInfo ?? ""} className={textareaClass} placeholder="In-unit, hookups, shared laundry, laundromat nearby..." />
        </Field>
        <Field label="Appliances included">
          <textarea name="appliancesIncluded" defaultValue={unit?.appliancesIncluded ?? ""} className={textareaClass} placeholder="Fridge, stove, dishwasher, microwave, washer/dryer..." />
        </Field>
        <Field label="Flooring / finishes">
          <textarea name="flooringInfo" defaultValue={unit?.flooringInfo ?? ""} className={textareaClass} placeholder="Hardwood, vinyl plank, carpeted bedrooms, fresh paint..." />
        </Field>
        <Field label="Yard / outdoor space">
          <textarea name="yardInfo" defaultValue={unit?.yardInfo ?? ""} className={textareaClass} placeholder="Fenced yard, porch, patio, lawn care expectations..." />
        </Field>
        <Field label="Smoking policy">
          <textarea name="smokingPolicy" defaultValue={unit?.smokingPolicy ?? ""} className={textareaClass} />
        </Field>
        <Field label="Lease terms">
          <textarea name="leaseTermsNote" defaultValue={unit?.leaseTermsNote ?? ""} className={textareaClass} placeholder="12-month lease, month-to-month option, renewal expectations..." />
        </Field>
        <Field label="Move-in fees">
          <textarea name="moveInFeesNote" defaultValue={unit?.moveInFeesNote ?? ""} className={textareaClass} placeholder="Application fee, pet deposit, key fee, utility transfer expectations..." />
        </Field>
        <Field label="Late fee policy">
          <textarea name="lateFeePolicy" defaultValue={unit?.lateFeePolicy ?? ""} className={textareaClass} placeholder="Grace period, flat fee, daily fee, payment arrangement notes..." />
        </Field>
        <Field label="Unit description">
          <textarea name="description" defaultValue={unit?.description ?? ""} className={textareaClass} />
        </Field>
        {!unit ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2">
            <label className="block text-sm font-black text-slate-950">Unit photos</label>
            <p className="mt-1 text-sm leading-6 text-slate-600">Upload up to 12 photos while creating the unit. The first photo becomes the featured marketplace photo.</p>
            <input name="photos" type="file" multiple accept="image/*" className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" />
          </div>
        ) : null}
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
        <Field label="Previous tenant notes">
          <textarea name="previousTenantNotes" defaultValue={unit?.previousTenantNotes ?? ""} className={textareaClass} placeholder="Turnover history, deposit outcomes, renewal notes, lessons learned for this unit." />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton>{unit ? "Save Unit" : "Create Unit"}</SubmitButton>
        <SecondaryLink href="/landlord/units">Cancel</SecondaryLink>
      </div>
    </form>
  );
}
