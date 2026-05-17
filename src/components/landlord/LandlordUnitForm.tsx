import { UnitStatus } from "@prisma/client";
import { updateLandlordUnit } from "@/app/landlord/actions";
import { Field, inputClass, SecondaryLink, selectClass, SubmitButton, textareaClass } from "@/components/admin/FormFields";

type LandlordUnitFormProps = {
  unit: {
    id: string;
    unitNumber: string;
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

const landlordStatuses = [UnitStatus.AVAILABLE, UnitStatus.PENDING, UnitStatus.OCCUPIED, UnitStatus.UNAVAILABLE];

export function LandlordUnitForm({ unit }: LandlordUnitFormProps) {
  return (
    <form action={updateLandlordUnit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <input type="hidden" name="id" value={unit.id} />
      <input type="hidden" name="unitNumber" value={unit.unitNumber} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Unit number">
          <input value={unit.unitNumber} disabled className={inputClass} />
        </Field>
        <Field label="Status">
          <select name="status" required defaultValue={unit.status === UnitStatus.ARCHIVED ? UnitStatus.UNAVAILABLE : unit.status} className={selectClass}>
            {landlordStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </Field>
        <Field label="Bedrooms">
          <input name="bedrooms" required type="number" min="0" step="1" defaultValue={unit.bedrooms} className={inputClass} />
        </Field>
        <Field label="Bathrooms">
          <input name="bathrooms" required type="number" min="0" step="0.5" defaultValue={unit.bathrooms} className={inputClass} />
        </Field>
        <Field label="Monthly rent">
          <input name="rentAmount" required type="number" min="0" step="1" defaultValue={unit.rentAmount} className={inputClass} />
        </Field>
        <Field label="Deposit">
          <input name="deposit" type="number" min="0" step="1" defaultValue={unit.deposit ?? ""} className={inputClass} />
        </Field>
        <Field label="Square feet">
          <input name="squareFeet" type="number" min="0" step="1" defaultValue={unit.squareFeet ?? ""} className={inputClass} />
        </Field>
        <div className="rounded-2xl bg-brand-50 p-4 md:col-span-2">
          <label className="flex items-start gap-3 text-sm font-semibold text-brand-900">
            <input type="checkbox" name="voucherFriendly" defaultChecked={unit.voucherFriendly} className="mt-1 h-4 w-4 rounded border-slate-300" />
            <span>
              Voucher-friendly listing
              <span className="block pt-1 text-xs font-normal leading-5 text-brand-900/70">Use this when the unit is open to voucher-assisted applicants.</span>
            </span>
          </label>
        </div>
        <Field label="Utilities note">
          <textarea name="utilitiesNote" defaultValue={unit.utilitiesNote ?? ""} className={textareaClass} />
        </Field>
        <Field label="Pet policy">
          <textarea name="petPolicy" defaultValue={unit.petPolicy ?? ""} className={textareaClass} />
        </Field>
        <Field label="Accessibility notes">
          <textarea name="accessibility" defaultValue={unit.accessibility ?? ""} className={textareaClass} />
        </Field>
        <Field label="Unit description">
          <textarea name="description" defaultValue={unit.description ?? ""} className={textareaClass} />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton>Save Listing Details</SubmitButton>
        <SecondaryLink href="/landlord/units">Cancel</SecondaryLink>
      </div>
    </form>
  );
}
