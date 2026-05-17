import { createProperty, updateProperty } from "@/app/admin/actions";
import { Field, inputClass, SecondaryLink, selectClass, SubmitButton, textareaClass } from "@/components/admin/FormFields";

type LandlordOption = {
  id: string;
  name: string | null;
  email: string;
};

type PropertyFormProps = {
  landlords?: LandlordOption[];
  property?: {
    id: string;
    name: string;
    addressLine: string;
    city: string;
    state: string;
    zip: string;
    description: string | null;
    ownerId: string | null;
    isArchived: boolean;
  };
};

export function PropertyForm({ property, landlords = [] }: PropertyFormProps) {
  const action = property ? updateProperty : createProperty;

  return (
    <form action={action} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {property ? <input type="hidden" name="id" value={property.id} /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Property name">
          <input name="name" required defaultValue={property?.name ?? ""} className={inputClass} placeholder="Aspen Park Apartments" />
        </Field>
        <Field label="Street address">
          <input name="addressLine" required defaultValue={property?.addressLine ?? ""} className={inputClass} placeholder="1000 Example Drive" />
        </Field>
        <Field label="City">
          <input name="city" required defaultValue={property?.city ?? ""} className={inputClass} placeholder="Joplin" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_1.2fr]">
          <Field label="State">
            <input name="state" required maxLength={2} defaultValue={property?.state ?? "MO"} className={inputClass} placeholder="MO" />
          </Field>
          <Field label="ZIP">
            <input name="zip" required defaultValue={property?.zip ?? ""} className={inputClass} placeholder="64801" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Landlord / owner" help="Assign an active landlord account to this property, or leave it unassigned for now.">
            <select name="ownerId" defaultValue={property?.ownerId ?? ""} className={selectClass}>
              <option value="">Unassigned</option>
              {landlords.map((landlord) => (
                <option key={landlord.id} value={landlord.id}>
                  {landlord.name || landlord.email} ({landlord.email})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Description" help="Use this for public-facing property notes or internal context.">
            <textarea name="description" defaultValue={property?.description ?? ""} className={textareaClass} placeholder="Briefly describe the property, location, or management notes." />
          </Field>
        </div>
        <div className="md:col-span-2 rounded-2xl bg-slate-50 p-4">
          <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" name="isArchived" defaultChecked={property?.isArchived ?? false} className="mt-1 h-4 w-4 rounded border-slate-300" />
            <span>
              Archive this property
              <span className="block pt-1 text-xs font-normal leading-5 text-slate-500">Archived properties stay in the database but should not be treated as active inventory.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton>{property ? "Save Property" : "Create Property"}</SubmitButton>
        <SecondaryLink href="/admin/properties">Cancel</SecondaryLink>
      </div>
    </form>
  );
}
