export const dynamic = "force-dynamic";

import { HouseholdRelationship, IncomeFrequency } from "@prisma/client";
import { addHouseholdMember, addIncomeSource, deleteHouseholdMember, deleteIncomeSource, saveApplicantProfile } from "@/app/applicant/actions";
import { ProfileDraftSaver } from "@/components/applicant/ProfileDraftSaver";
import { Field, inputClass, selectClass, textareaClass } from "@/components/admin/FormFields";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function dateValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

const states = ["", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY", "DC"];

export default async function ApplicantProfilePage({ searchParams }: { searchParams?: { saved?: string } }) {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/profile");
  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: user.userId },
    include: { householdMembers: { orderBy: { createdAt: "asc" } }, incomeSources: { orderBy: { createdAt: "asc" } } }
  });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Applicant portal</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">My profile</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Keep your household, contact, rental history, and income information ready for application review.</p>
      </div>
      {searchParams?.saved === "1" ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">
          Applicant profile saved. Your reusable packet is ready for faster applications.
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
        <form action={saveApplicantProfile} data-profile-draft-form className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <ProfileDraftSaver storageKey={`homebase-profile-draft-${user.userId}`} />
          <h2 className="text-2xl font-black text-slate-950">Basic information</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Legal name"><input name="legalName" required defaultValue={profile?.legalName ?? user.name ?? ""} className={inputClass} /></Field>
            <Field label="Preferred name"><input name="preferredName" defaultValue={profile?.preferredName ?? ""} className={inputClass} /></Field>
            <Field label="Phone"><input name="phone" defaultValue={profile?.phone ?? ""} className={inputClass} /></Field>
            <Field label="Household size"><input name="householdSize" type="number" min="0" defaultValue={profile?.householdSize ?? ""} className={inputClass} /></Field>
            <Field label="Current address"><input name="currentAddress" defaultValue={profile?.currentAddress ?? ""} className={inputClass} /></Field>
            <Field label="City"><input name="city" defaultValue={profile?.city ?? ""} className={inputClass} /></Field>
            <Field label="State"><input name="state" maxLength={2} defaultValue={profile?.state ?? ""} className={inputClass} /></Field>
            <Field label="ZIP"><input name="zip" defaultValue={profile?.zip ?? ""} className={inputClass} /></Field>
            <div className="md:col-span-2"><Field label="Rental history"><textarea name="rentalHistory" defaultValue={profile?.rentalHistory ?? ""} className={textareaClass} placeholder="Briefly describe recent rental history, current landlord, or housing situation." /></Field></div>
            <Field label="Desired bedrooms"><input name="desiredBedrooms" type="number" min="0" defaultValue={profile?.desiredBedrooms ?? ""} className={inputClass} /></Field>
            <Field label="Desired bathrooms"><input name="desiredBathrooms" type="number" min="0" step="0.5" defaultValue={profile?.desiredBathrooms ?? ""} className={inputClass} /></Field>
            <Field label="Max rent"><input name="maxRent" type="number" min="0" defaultValue={profile?.maxRent ?? ""} className={inputClass} /></Field>
            <Field label="Desired move-in date"><input name="desiredMoveInDate" type="date" defaultValue={profile?.desiredMoveInDate ? profile.desiredMoveInDate.toISOString().slice(0, 10) : ""} className={inputClass} /></Field>
            <div className="rounded-2xl bg-brand-50 p-4 md:col-span-2">
              <label className="flex items-start gap-3 text-sm font-semibold text-brand-900">
                <input type="checkbox" name="voucherHolder" defaultChecked={profile?.voucherHolder ?? false} className="mt-1 h-4 w-4 rounded border-slate-300" />
                <span>Voucher holder or voucher-assisted household</span>
              </label>
            </div>
            <Field label="Pets"><textarea name="pets" defaultValue={profile?.pets ?? ""} className={textareaClass} placeholder="Pet type, breed, weight, service/support animal notes, etc." /></Field>
            <Field label="Accessibility needs"><textarea name="accessibilityNeeds" defaultValue={profile?.accessibilityNeeds ?? ""} className={textareaClass} placeholder="Ground-floor, no stairs, accessibility equipment, parking, or other needs." /></Field>
            <Field label="Landlord references"><textarea name="landlordReferences" defaultValue={profile?.landlordReferences ?? ""} className={textareaClass} placeholder="Previous landlord names, phone/email, dates, or notes." /></Field>
            <Field label="Employment summary"><textarea name="employmentSummary" defaultValue={profile?.employmentSummary ?? ""} className={textareaClass} placeholder="Employer, job stability, pay schedule, or benefit income context." /></Field>
            <div className="md:col-span-2"><Field label="Renter profile bio"><textarea name="renterBio" defaultValue={profile?.renterBio ?? ""} className={textareaClass} placeholder="A short, landlord-friendly summary of your household, rental goals, and strengths as a renter." /></Field></div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Reusable application packet</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Applicant details and acknowledgements</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Save the screening, housing review, disclosure, and certification details once so future applications can be started from a listing with only authorization to share.
            </p>
            {profile?.applicantPacketSignedAt ? (
              <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800">
                Packet signed {profile.applicantPacketSignedAt.toLocaleDateString()}
              </span>
            ) : (
              <span className="mt-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-900">
                Signature needed
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Date of birth">
              <input name="dateOfBirth" type="date" defaultValue={dateValue(profile?.dateOfBirth)} className={inputClass} />
            </Field>
            <Field label="Government ID type">
              <select name="governmentIdType" defaultValue={profile?.governmentIdType ?? "Driver license"} className={selectClass}>
                <option value="Driver license">Driver license</option>
                <option value="State ID">State ID</option>
                <option value="Passport">Passport</option>
                <option value="Other government ID">Other government ID</option>
              </select>
            </Field>
            <Field label="Driver license state">
              <select name="driversLicenseState" defaultValue={profile?.driversLicenseState ?? ""} className={selectClass}>
                {states.map((state) => <option key={state || "blank"} value={state}>{state || "Select state"}</option>)}
              </select>
            </Field>
            <Field label="Driver license number">
              <input name="driversLicenseNumber" defaultValue={profile?.driversLicenseNumber ?? ""} className={inputClass} placeholder="Enter license number" />
            </Field>
            <Field label="Emergency contact name">
              <input name="emergencyContactName" defaultValue={profile?.emergencyContactName ?? ""} className={inputClass} />
            </Field>
            <Field label="Emergency contact phone">
              <input name="emergencyContactPhone" defaultValue={profile?.emergencyContactPhone ?? ""} className={inputClass} />
            </Field>
            <Field label="Emergency contact relationship">
              <input name="emergencyContactRelation" defaultValue={profile?.emergencyContactRelation ?? ""} className={inputClass} />
            </Field>
            <Field label="Current housing start date">
              <input name="currentHousingStartDate" type="date" defaultValue={dateValue(profile?.currentHousingStartDate)} className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Previous address">
                <input name="previousAddress" defaultValue={profile?.previousAddress ?? ""} className={inputClass} placeholder="Street, city, state, ZIP" />
              </Field>
            </div>
            <Field label="Previous landlord name">
              <input name="previousLandlordName" defaultValue={profile?.previousLandlordName ?? ""} className={inputClass} />
            </Field>
            <Field label="Previous landlord phone or email">
              <input name="previousLandlordPhone" defaultValue={profile?.previousLandlordPhone ?? ""} className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Reason for moving">
                <textarea name="reasonForMoving" defaultValue={profile?.reasonForMoving ?? ""} className={textareaClass} placeholder="Briefly explain why you are moving or what kind of housing you are looking for." />
              </Field>
            </div>
            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 md:col-span-2">
              <h3 className="text-lg font-black text-slate-950">Case worker and voucher details</h3>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
            <Field label="Voucher or subsidy program">
              <input name="voucherProgram" defaultValue={profile?.voucherProgram ?? ""} className={inputClass} placeholder="Section 8, RAP, SPC, VASH, etc." />
            </Field>
            <Field label="Housing agency">
              <input name="voucherAgency" defaultValue={profile?.voucherAgency ?? ""} className={inputClass} placeholder="Housing authority, nonprofit, VA, etc." />
            </Field>
            <Field label="Voucher case worker">
              <input name="voucherCaseWorker" defaultValue={profile?.voucherCaseWorker ?? ""} className={inputClass} />
            </Field>
            <Field label="Case worker contact">
              <input name="voucherCaseWorkerContact" defaultValue={profile?.voucherCaseWorkerContact ?? ""} className={inputClass} />
            </Field>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-lg font-black text-slate-950">Vehicle information</h3>
                <div className="mt-4 grid gap-5 md:grid-cols-3">
                  <Field label="Make"><input name="vehicleMake" defaultValue={profile?.vehicleMake ?? ""} className={inputClass} placeholder="Toyota" /></Field>
                  <Field label="Model"><input name="vehicleModel" defaultValue={profile?.vehicleModel ?? ""} className={inputClass} placeholder="Camry" /></Field>
                  <Field label="Year"><input name="vehicleYear" defaultValue={profile?.vehicleYear ?? ""} className={inputClass} placeholder="2018" /></Field>
                  <Field label="Color"><input name="vehicleColor" defaultValue={profile?.vehicleColor ?? ""} className={inputClass} placeholder="Silver" /></Field>
                  <Field label="License plate number"><input name="licensePlateNumber" defaultValue={profile?.licensePlateNumber ?? ""} className={inputClass} /></Field>
                  <Field label="Plate state"><select name="licensePlateState" defaultValue={profile?.licensePlateState ?? ""} className={selectClass}>{states.map((state) => <option key={state || "blank"} value={state}>{state || "Select state"}</option>)}</select></Field>
                  <div className="md:col-span-3"><Field label="Parking or vehicle notes"><textarea name="vehicleInfo" defaultValue={profile?.vehicleInfo ?? ""} className={textareaClass} placeholder="Parking needs, second vehicle, no vehicle, accessibility placard, etc." /></Field></div>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <Field label="Service animal or accommodation details">
                <textarea name="serviceAnimalAccommodation" defaultValue={profile?.serviceAnimalAccommodation ?? ""} className={textareaClass} placeholder="Optional accessibility or accommodation notes." />
              </Field>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
              <input type="checkbox" name="hasPriorEviction" defaultChecked={profile?.hasPriorEviction ?? false} className="mr-2 h-4 w-4 rounded border-slate-300" />
              Prior eviction history
            </label>
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
              <input type="checkbox" name="hasCriminalHistory" defaultChecked={profile?.hasCriminalHistory ?? false} className="mr-2 h-4 w-4 rounded border-slate-300" />
              Criminal history to explain
            </label>
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
              <input type="checkbox" name="hasOutstandingUtilities" defaultChecked={profile?.hasOutstandingUtilities ?? false} className="mr-2 h-4 w-4 rounded border-slate-300" />
              Outstanding utility balance
            </label>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <Field label="Eviction explanation">
              <textarea name="priorEvictionExplanation" defaultValue={profile?.priorEvictionExplanation ?? ""} className={textareaClass} />
            </Field>
            <Field label="Criminal history explanation">
              <textarea name="criminalHistoryExplanation" defaultValue={profile?.criminalHistoryExplanation ?? ""} className={textareaClass} />
            </Field>
            <Field label="Utility balance explanation">
              <textarea name="outstandingUtilitiesExplanation" defaultValue={profile?.outstandingUtilitiesExplanation ?? ""} className={textareaClass} />
            </Field>
          </div>

          <div className="mt-6 rounded-3xl border border-brand-100 bg-brand-50 p-5">
            <h3 className="text-lg font-black text-slate-950">Reusable applicant certification</h3>
            <div className="mt-4 space-y-3 text-sm leading-6 text-brand-950">
              <label className="flex gap-3">
                <input type="checkbox" name="consentToScreening" defaultChecked={profile?.consentToScreening ?? false} className="mt-1 h-4 w-4 rounded border-slate-300" />
                <span>I authorize the housing team or property representative to review my application information, contact references, and request screening information allowed by law and program policy when I apply to a home.</span>
              </label>
              <label className="flex gap-3">
                <input type="checkbox" name="informationCertified" defaultChecked={profile?.informationCertified ?? false} className="mt-1 h-4 w-4 rounded border-slate-300" />
                <span>I certify that the reusable profile information I provided is accurate to the best of my knowledge and understand that incomplete or inaccurate information may delay review.</span>
              </label>
            </div>
            <Field label="Type your full legal name as your reusable packet signature">
              <input name="applicantSignature" defaultValue={profile?.applicantSignature ?? ""} className={inputClass} />
            </Field>
          </div>
          <button type="submit" className="mt-6 rounded-2xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">Save Profile</button>
        </form>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Household members</h2>
            <form action={addHouseholdMember} className="mt-5 space-y-4">
              <Field label="Name"><input name="name" required className={inputClass} /></Field>
              <Field label="Relationship"><select name="relationship" className={selectClass}>{Object.values(HouseholdRelationship).map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
              <Field label="Age"><input name="age" type="number" min="0" className={inputClass} /></Field>
              <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">Add Member</button>
            </form>
            <div className="mt-5 space-y-2">
              {profile?.householdMembers.length ? profile.householdMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
                  <span><strong>{member.name}</strong><br />{label(member.relationship)}{member.age !== null ? ` - Age ${member.age}` : ""}</span>
                  <form action={deleteHouseholdMember}><input type="hidden" name="id" value={member.id} /><button className="font-bold text-rose-700">Remove</button></form>
                </div>
              )) : <p className="text-sm text-slate-600">No household members added yet.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Income sources</h2>
            <form action={addIncomeSource} className="mt-5 space-y-4">
              <Field label="Source"><input name="sourceName" required className={inputClass} placeholder="Employment, SSI, child support, etc." /></Field>
              <Field label="Amount"><input name="amount" type="number" min="0" required className={inputClass} /></Field>
              <Field label="Frequency"><select name="frequency" className={selectClass}>{Object.values(IncomeFrequency).map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
              <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800">Add Income</button>
            </form>
            <div className="mt-5 space-y-2">
              {profile?.incomeSources.length ? profile.incomeSources.map((income) => (
                <div key={income.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
                  <span><strong>{income.sourceName}</strong><br />${income.amount.toLocaleString()} - {label(income.frequency)}</span>
                  <form action={deleteIncomeSource}><input type="hidden" name="id" value={income.id} /><button className="font-bold text-rose-700">Remove</button></form>
                </div>
              )) : <p className="text-sm text-slate-600">No income sources added yet.</p>}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
