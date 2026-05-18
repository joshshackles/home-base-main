import { UserRole } from "@prisma/client";
import { createUser, updateUser } from "@/app/admin/actions";
import { passwordPolicyMessage, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { Field, inputClass, SecondaryLink, selectClass, SubmitButton } from "@/components/admin/FormFields";

type UserFormProps = {
  user?: {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
    isActive: boolean;
  };
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  LANDLORD: "Landlord",
  APPLICANT: "Applicant",
  TENANT: "Tenant",
  INSPECTOR: "Inspector",
  VENDOR: "Vendor"
};

export function UserForm({ user }: UserFormProps) {
  const action = user ? updateUser : createUser;

  return (
    <form action={action} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Name">
          <input name="name" required defaultValue={user?.name ?? ""} className={inputClass} placeholder="Property Manager" />
        </Field>

        <Field label="Email">
          <input name="email" type="email" required defaultValue={user?.email ?? ""} className={inputClass} placeholder="manager@example.com" />
        </Field>

        <Field label="Role" help="Roles control what this person should eventually be able to access.">
          <select name="role" required defaultValue={user?.role ?? "LANDLORD"} className={selectClass}>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>

        <Field label={user ? "New password" : "Temporary password"} help={user ? `Leave blank to keep the current password. ${passwordPolicyMessage()}` : `${passwordPolicyMessage()} The user will be forced to change it later.`}>
          <input name="password" type="password" required={!user} minLength={user ? undefined : MIN_PASSWORD_LENGTH} className={inputClass} placeholder={user ? "Optional" : `At least ${MIN_PASSWORD_LENGTH} characters`} />
        </Field>

        <div className="md:col-span-2 rounded-2xl bg-slate-50 p-4">
          <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" name="isActive" defaultChecked={user?.isActive ?? true} className="mt-1 h-4 w-4 rounded border-slate-300" />
            <span>
              Active account
              <span className="block pt-1 text-xs font-normal leading-5 text-slate-500">Inactive users cannot be used as active staff or landlord accounts.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <SubmitButton>{user ? "Save User" : "Create User"}</SubmitButton>
        <SecondaryLink href="/admin/users">Cancel</SecondaryLink>
      </div>
    </form>
  );
}
