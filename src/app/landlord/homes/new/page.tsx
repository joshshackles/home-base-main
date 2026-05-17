export const dynamic = "force-dynamic";

import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { SingleFamilyHomeForm } from "@/components/landlord/SingleFamilyHomeForm";
import { requireRole } from "@/lib/auth";

export default async function NewLandlordHomePage() {
  await requireRole(["LANDLORD"], "/landlord/homes/new");

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader
        title="Add Home"
        description="Use this faster path when one address equals one rentable home. HomeBase will create the property record and the public listing together."
        actionHref="/landlord/units"
        actionLabel="Back to units"
      />
      <SingleFamilyHomeForm />
    </main>
  );
}
