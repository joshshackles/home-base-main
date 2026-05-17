import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UserForm } from "@/components/admin/UserForm";

export default function NewUserPage() {
  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        title="Add User"
        description="Create a new account for an admin, landlord, applicant, tenant, or inspector."
      />
      <UserForm />
    </main>
  );
}
