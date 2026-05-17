import { HouseholdRelationship, IncomeFrequency } from "@prisma/client";
import { addHouseholdMember, addIncomeSource, deleteHouseholdMember, deleteIncomeSource, saveApplicantProfile } from "@/app/applicant/actions";
import { Field, inputClass, selectClass, textareaClass } from "@/components/admin/FormFields";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function ApplicantProfilePage() {
  const user = await requireRole(["APPLICANT", "TENANT"], "/applicant/profile");
  const profile = await prisma.applicantProfile.findUnique({
    where: { userId: user.userId },
    include: { householdMembers: { orderBy: { createdAt: "asc" } }, incomeSources: { orderBy: { createdAt: "asc" } } }
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Applicant portal</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">My profile</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Keep your household, contact, rental history, and income information ready for application review.</p>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
        <form action={saveApplicantProfile} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
                  <span><strong>{member.name}</strong><br />{label(member.relationship)}{member.age !== null ? ` · Age ${member.age}` : ""}</span>
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
                  <span><strong>{income.sourceName}</strong><br />${income.amount.toLocaleString()} · {label(income.frequency)}</span>
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
