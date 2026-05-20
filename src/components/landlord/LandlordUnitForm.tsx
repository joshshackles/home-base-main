import { RentalPropertyType, UnitStatus } from "@prisma/client";
import { createLandlordUnit, updateLandlordUnit } from "@/app/landlord/actions";
import { Field, inputClass, SecondaryLink, selectClass, SubmitButton, textareaClass } from "@/components/admin/FormFields";

type TenantOption = { id: string; name: string | null; email: string };
type ApplicationOption = { id: string; applicantName: string; applicantEmail: string; status: string };

type LandlordUnitFormProps = {
  tenants?: TenantOption[];
  applications?: ApplicationOption[];
  unit?: {
    id: string; propertyId: string;
    property: { name: string; addressLine: string; city: string; state: string; zip: string; description: string | null };
    unitNumber: string; rentalType?: RentalPropertyType; tenantUserId: string | null; currentApplicationId: string | null;
    bedrooms: number; bathrooms: number; rentAmount: number; deposit: number | null; squareFeet: number | null; voucherFriendly: boolean;
    utilitiesNote: string | null; accessibility: string | null; petPolicy: string | null; schoolDistrict: string | null; neighborhood: string | null; nearbyFeatures: string | null;
    yearBuilt: number | null; roofAgeYears: number | null; averageUtilityBill: number | null; parkingInfo: string | null; laundryInfo: string | null; appliancesIncluded: string | null;
    flooringInfo: string | null; yardInfo: string | null; smokingPolicy: string | null; leaseTermsNote: string | null; moveInFeesNote: string | null; availableOn: Date | null; rentDueDay: number | null;
    lateFeePolicy: string | null; previousTenantNotes: string | null; status: UnitStatus; description: string | null; clientNotes: string | null; importantContacts: string | null;
  };
};

const landlordStatuses = [UnitStatus.AVAILABLE, UnitStatus.PENDING, UnitStatus.OCCUPIED];
const rentalTypeLabels: Record<RentalPropertyType, string> = { SINGLE_FAMILY: "Single-family home", DUPLEX: "Duplex", APARTMENT: "Apartment", MOBILE_HOME: "Mobile home", CONDO: "Condo", TOWNHOME: "Townhouse", ROOM: "Room", COMMERCIAL: "Commercial", OTHER: "Other" };

function optionLabel(name: string | null, email: string) { return name ? `${name} (${email})` : email; }

export function LandlordUnitForm({ tenants = [], applications = [], unit }: LandlordUnitFormProps) {
  const action = unit ? updateLandlordUnit : createLandlordUnit;
  const property = unit?.property;

  return (
    <form action={action} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {unit ? <input type="hidden" name="id" value={unit.id} /> : null}
      {unit ? <input type="hidden" name="propertyId" value={unit.propertyId} /> : null}
      <div className="mb-6 rounded-3xl border border-brand-100 bg-brand-50 p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">One rental record</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Create the rental, address, and type from one form.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">Choose single-family home, apartment, mobile home, townhouse, duplex, condo, room, commercial, or other. No separate property setup is required.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Rental name"><input name="propertyName" required defaultValue={property?.name ?? ""} className={inputClass} placeholder="123 Main St, Aspen Park 4B, or South Joplin Home" /></Field>
        <Field label="Rental number/name"><input name="unitNumber" required defaultValue={unit?.unitNumber ?? "Main"} className={inputClass} placeholder="Main, 101, 4B, Suite A" /></Field>
        <Field label="Street address"><input name="addressLine" required defaultValue={property?.addressLine ?? ""} className={inputClass} placeholder="1000 Example Drive" /></Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_0.45fr_0.7fr]"><Field label="City"><input name="city" required defaultValue={property?.city ?? ""} className={inputClass} placeholder="Joplin" /></Field><Field label="State"><input name="state" required maxLength={2} defaultValue={property?.state ?? "MO"} className={inputClass} placeholder="MO" /></Field><Field label="ZIP"><input name="zip" required defaultValue={property?.zip ?? ""} className={inputClass} placeholder="64801" /></Field></div>
        <Field label="Rental type"><select name="rentalType" defaultValue={unit?.rentalType ?? RentalPropertyType.SINGLE_FAMILY} className={selectClass}>{Object.values(RentalPropertyType).map((type) => <option key={type} value={type}>{rentalTypeLabels[type]}</option>)}</select></Field>
        <Field label="Status"><select name="status" required defaultValue={unit?.status === UnitStatus.ARCHIVED ? UnitStatus.PENDING : unit?.status ?? UnitStatus.AVAILABLE} className={selectClass}>{landlordStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></Field>
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><p className="font-black">Public directory rule</p><p>Rentals marked AVAILABLE are automatically listed in the marketplace. Any other status keeps the rental private.</p></div>
        <Field label="Bedrooms"><input name="bedrooms" required type="number" min="0" step="1" defaultValue={unit?.bedrooms ?? 1} className={inputClass} /></Field>
        <Field label="Bathrooms"><input name="bathrooms" required type="number" min="0" step="0.5" defaultValue={unit?.bathrooms ?? 1} className={inputClass} /></Field>
        <Field label="Monthly rent"><input name="rentAmount" required type="number" min="0" step="1" defaultValue={unit?.rentAmount ?? ""} className={inputClass} /></Field>
        <Field label="Deposit"><input name="deposit" type="number" min="0" step="1" defaultValue={unit?.deposit ?? ""} className={inputClass} /></Field>
        <Field label="Square feet"><input name="squareFeet" type="number" min="0" step="1" defaultValue={unit?.squareFeet ?? ""} className={inputClass} /></Field>
        <Field label="School district"><input name="schoolDistrict" defaultValue={unit?.schoolDistrict ?? ""} className={inputClass} placeholder="Joplin Schools" /></Field>
        <Field label="Neighborhood / area"><input name="neighborhood" defaultValue={unit?.neighborhood ?? ""} className={inputClass} placeholder="Eastmoreland, downtown, near hospital..." /></Field>
        <Field label="Year built"><input name="yearBuilt" type="number" min="1800" step="1" defaultValue={unit?.yearBuilt ?? ""} className={inputClass} /></Field>
        <Field label="Roof age"><input name="roofAgeYears" type="number" min="0" step="1" defaultValue={unit?.roofAgeYears ?? ""} className={inputClass} placeholder="Years" /></Field>
        <Field label="Average utility bill"><input name="averageUtilityBill" type="number" min="0" step="1" defaultValue={unit?.averageUtilityBill ?? ""} className={inputClass} /></Field>
        <Field label="Rent due day"><input name="rentDueDay" type="number" min="1" max="31" step="1" defaultValue={unit?.rentDueDay ?? ""} className={inputClass} placeholder="1" /></Field>
        <Field label="Available date"><input name="availableOn" type="date" defaultValue={unit?.availableOn ? unit.availableOn.toISOString().slice(0, 10) : ""} className={inputClass} /></Field>
        <div className="rounded-2xl bg-brand-50 p-4 md:col-span-2"><label className="flex items-start gap-3 text-sm font-semibold text-brand-900"><input type="checkbox" name="voucherFriendly" defaultChecked={unit?.voucherFriendly ?? false} className="mt-1 h-4 w-4 rounded border-slate-300" /><span>Voucher-friendly listing<span className="block pt-1 text-xs font-normal leading-5 text-brand-900/70">Use this when the rental is open to voucher-assisted applicants.</span></span></label></div>
        <Field label="Utilities note"><textarea name="utilitiesNote" defaultValue={unit?.utilitiesNote ?? ""} className={textareaClass} /></Field>
        <Field label="Pet policy"><textarea name="petPolicy" defaultValue={unit?.petPolicy ?? ""} className={textareaClass} /></Field>
        <Field label="Accessibility notes"><textarea name="accessibility" defaultValue={unit?.accessibility ?? ""} className={textareaClass} /></Field>
        <Field label="Nearby features"><textarea name="nearbyFeatures" defaultValue={unit?.nearbyFeatures ?? ""} className={textareaClass} placeholder="Bus routes, parks, grocery, medical, schools, employers..." /></Field>
        <Field label="Parking"><textarea name="parkingInfo" defaultValue={unit?.parkingInfo ?? ""} className={textareaClass} placeholder="Garage, driveway, street parking, assigned spaces..." /></Field>
        <Field label="Laundry"><textarea name="laundryInfo" defaultValue={unit?.laundryInfo ?? ""} className={textareaClass} placeholder="In-unit, hookups, shared laundry, laundromat nearby..." /></Field>
        <Field label="Appliances included"><textarea name="appliancesIncluded" defaultValue={unit?.appliancesIncluded ?? ""} className={textareaClass} placeholder="Fridge, stove, dishwasher, microwave, washer/dryer..." /></Field>
        <Field label="Flooring / finishes"><textarea name="flooringInfo" defaultValue={unit?.flooringInfo ?? ""} className={textareaClass} placeholder="Hardwood, vinyl plank, carpeted bedrooms, fresh paint..." /></Field>
        <Field label="Yard / outdoor space"><textarea name="yardInfo" defaultValue={unit?.yardInfo ?? ""} className={textareaClass} placeholder="Fenced yard, porch, patio, lawn care expectations..." /></Field>
        <Field label="Smoking policy"><textarea name="smokingPolicy" defaultValue={unit?.smokingPolicy ?? ""} className={textareaClass} /></Field>
        <Field label="Lease terms"><textarea name="leaseTermsNote" defaultValue={unit?.leaseTermsNote ?? ""} className={textareaClass} placeholder="12-month lease, month-to-month option, renewal expectations..." /></Field>
        <Field label="Move-in fees"><textarea name="moveInFeesNote" defaultValue={unit?.moveInFeesNote ?? ""} className={textareaClass} placeholder="Application fee, pet deposit, key fee, utility transfer expectations..." /></Field>
        <Field label="Late fee policy"><textarea name="lateFeePolicy" defaultValue={unit?.lateFeePolicy ?? ""} className={textareaClass} placeholder="Grace period, flat fee, daily fee, payment arrangement notes..." /></Field>
        <Field label="Rental description"><textarea name="description" defaultValue={unit?.description ?? property?.description ?? ""} className={textareaClass} /></Field>
        {!unit ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2"><label className="block text-sm font-black text-slate-950">Rental photos</label><p className="mt-1 text-sm leading-6 text-slate-600">Upload up to 12 photos while creating the rental. The first photo becomes the featured marketplace photo.</p><input name="photos" type="file" multiple accept="image/*" className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" /></div> : null}
        <Field label="Assigned tenant" help="Link the rental to an active applicant or tenant account when someone is occupying it."><select name="tenantUserId" defaultValue={unit?.tenantUserId ?? ""} className={selectClass}><option value="">No tenant assigned</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{optionLabel(tenant.name, tenant.email)}</option>)}</select></Field>
        <Field label="Current application" help="Connects messages, lease packets, repairs, and ledger activity to the tenant workflow."><select name="currentApplicationId" defaultValue={unit?.currentApplicationId ?? ""} className={selectClass}><option value="">No application linked</option>{applications.map((application) => <option key={application.id} value={application.id}>{application.applicantName} - {application.status}</option>)}</select></Field>
        <Field label="Important contacts"><textarea name="importantContacts" defaultValue={unit?.importantContacts ?? ""} className={textareaClass} placeholder="Case worker, emergency contact, property contact, preferred vendor..." /></Field>
        <Field label="Client notes"><textarea name="clientNotes" defaultValue={unit?.clientNotes ?? ""} className={textareaClass} placeholder="Private landlord notes about tenant preferences, communication history, or support details." /></Field>
        <Field label="Previous tenant notes"><textarea name="previousTenantNotes" defaultValue={unit?.previousTenantNotes ?? ""} className={textareaClass} placeholder="Turnover history, deposit outcomes, renewal notes, lessons learned for this rental." /></Field>
      </div>
      <div className="mt-6 flex flex-wrap gap-3"><SubmitButton>{unit ? "Save Rental" : "Create Rental"}</SubmitButton><SecondaryLink href="/landlord/rentals">Cancel</SecondaryLink></div>
    </form>
  );
}
