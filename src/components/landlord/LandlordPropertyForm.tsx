import { createLandlordProperty } from "@/app/landlord/actions";
import { Field, inputClass, SecondaryLink, SubmitButton, textareaClass } from "@/components/admin/FormFields";

export function LandlordPropertyForm() {
  return (
    <form action={createLandlordProperty} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        <p className="font-black text-slate-950">Use this for multi-unit properties</p>
        <p className="mt-1">Examples: an apartment complex, a duplex with separate sides, or a building where several units share the same property address.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Property name">
          <input name="name" required className={inputClass} placeholder="Oak Street Duplex" />
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
        <div className="md:col-span-2">
          <Field label="Description" help="This can be public-facing property context or a short management note.">
            <textarea name="description" className={textareaClass} placeholder="Briefly describe the property, location, or management setup." />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton>Create Property</SubmitButton>
        <SecondaryLink href="/landlord/properties">Cancel</SecondaryLink>
      </div>
    </form>
  );
}
