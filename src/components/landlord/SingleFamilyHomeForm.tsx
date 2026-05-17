import { UnitStatus } from "@prisma/client";
import { createLandlordSingleFamilyHome } from "@/app/landlord/actions";
import { Field, inputClass, SecondaryLink, selectClass, SubmitButton, textareaClass } from "@/components/admin/FormFields";

const listingStatuses = [UnitStatus.AVAILABLE, UnitStatus.PENDING, UnitStatus.OCCUPIED, UnitStatus.UNAVAILABLE];

export function SingleFamilyHomeForm() {
  return (
    <form action={createLandlordSingleFamilyHome} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
        <p className="font-black">Best for single-family homes, duplex sides, condos, and townhomes</p>
        <p className="mt-1">This creates the property and the rentable listing together, so you do not have to think in apartment-complex terms.</p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Home nickname, optional" help="Shown to you as the property name. Leave blank to use the street address.">
          <input name="name" className={inputClass} placeholder="Oak Street House" />
        </Field>
        <Field label="Street address">
          <input name="addressLine" required className={inputClass} placeholder="1000 Example Drive" />
        </Field>
        <Field label="City">
          <input name="city" required className={inputClass} placeholder="Joplin" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_1.2fr]">
          <Field label="State">
            <input name="state" required maxLength={2} defaultValue="MO" className={inputClass} placeholder="MO" />
          </Field>
          <Field label="ZIP">
            <input name="zip" required className={inputClass} placeholder="64801" />
          </Field>
        </div>
        <Field label="Listing status">
          <select name="status" required defaultValue={UnitStatus.AVAILABLE} className={selectClass}>
            {listingStatuses.map((status) => (
              <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
            ))}
          </select>
        </Field>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <p className="font-black text-slate-950">Public directory rule</p>
          <p>Set status to AVAILABLE when this home should appear in the public rentals directory.</p>
        </div>
        <Field label="Bedrooms">
          <input name="bedrooms" required type="number" min="0" step="1" defaultValue={3} className={inputClass} />
        </Field>
        <Field label="Bathrooms">
          <input name="bathrooms" required type="number" min="0" step="0.5" defaultValue={1} className={inputClass} />
        </Field>
        <Field label="Monthly rent">
          <input name="rentAmount" required type="number" min="0" step="1" className={inputClass} />
        </Field>
        <Field label="Deposit">
          <input name="deposit" type="number" min="0" step="1" className={inputClass} />
        </Field>
        <Field label="Square feet">
          <input name="squareFeet" type="number" min="0" step="1" className={inputClass} />
        </Field>
        <Field label="School district">
          <input name="schoolDistrict" className={inputClass} placeholder="Joplin Schools" />
        </Field>
        <Field label="Neighborhood / area">
          <input name="neighborhood" className={inputClass} placeholder="Near downtown, hospital district, quiet cul-de-sac..." />
        </Field>
        <Field label="Year built">
          <input name="yearBuilt" type="number" min="1800" step="1" className={inputClass} />
        </Field>
        <Field label="Roof age">
          <input name="roofAgeYears" type="number" min="0" step="1" className={inputClass} placeholder="Years" />
        </Field>
        <Field label="Average utility bill">
          <input name="averageUtilityBill" type="number" min="0" step="1" className={inputClass} />
        </Field>
        <Field label="Rent due day">
          <input name="rentDueDay" type="number" min="1" max="31" step="1" className={inputClass} placeholder="1" />
        </Field>
        <div className="rounded-2xl bg-brand-50 p-4">
          <label className="flex items-start gap-3 text-sm font-semibold text-brand-900">
            <input type="checkbox" name="voucherFriendly" className="mt-1 h-4 w-4 rounded border-slate-300" />
            <span>Voucher-friendly listing</span>
          </label>
        </div>
        <Field label="Utilities">
          <textarea name="utilitiesNote" className={textareaClass} placeholder="Example: Tenant pays electric and gas. Owner pays trash." />
        </Field>
        <Field label="Pet policy">
          <textarea name="petPolicy" className={textareaClass} placeholder="Example: Cats allowed, small dogs considered with deposit." />
        </Field>
        <Field label="Accessibility notes">
          <textarea name="accessibility" className={textareaClass} placeholder="Example: One-step entry, main-floor bedroom, driveway parking." />
        </Field>
        <Field label="Nearby features">
          <textarea name="nearbyFeatures" className={textareaClass} placeholder="Bus stop, schools, parks, grocery, employers, medical offices..." />
        </Field>
        <Field label="Parking">
          <textarea name="parkingInfo" className={textareaClass} placeholder="Garage, driveway, assigned space, street parking..." />
        </Field>
        <Field label="Laundry">
          <textarea name="laundryInfo" className={textareaClass} placeholder="In-unit, hookups, shared laundry, laundromat nearby..." />
        </Field>
        <Field label="Appliances included">
          <textarea name="appliancesIncluded" className={textareaClass} placeholder="Fridge, stove, dishwasher, microwave, washer/dryer..." />
        </Field>
        <Field label="Flooring / finishes">
          <textarea name="flooringInfo" className={textareaClass} placeholder="Hardwood, vinyl plank, carpeted bedrooms, fresh paint..." />
        </Field>
        <Field label="Yard / outdoor space">
          <textarea name="yardInfo" className={textareaClass} placeholder="Fenced yard, porch, lawn care, shed, patio..." />
        </Field>
        <Field label="Smoking policy">
          <textarea name="smokingPolicy" className={textareaClass} />
        </Field>
        <Field label="Lease terms">
          <textarea name="leaseTermsNote" className={textareaClass} placeholder="12-month lease, month-to-month option, renewal expectations..." />
        </Field>
        <Field label="Move-in fees">
          <textarea name="moveInFeesNote" className={textareaClass} placeholder="Pet deposit, key fee, utility transfer expectations..." />
        </Field>
        <Field label="Late fee policy">
          <textarea name="lateFeePolicy" className={textareaClass} placeholder="Grace period, flat fee, payment arrangement notes..." />
        </Field>
        <Field label="Listing description">
          <textarea name="description" className={textareaClass} placeholder="Describe the home, neighborhood, yard, parking, appliances, and application expectations." />
        </Field>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2">
          <label className="block text-sm font-black text-slate-950">Home photos</label>
          <p className="mt-1 text-sm leading-6 text-slate-600">Upload up to 12 photos while creating the home. The first photo becomes the featured marketplace photo.</p>
          <input name="photos" type="file" multiple accept="image/*" className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton>Create Home Listing</SubmitButton>
        <SecondaryLink href="/landlord/units">Cancel</SecondaryLink>
      </div>
    </form>
  );
}
