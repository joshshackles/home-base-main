export const dynamic = "force-dynamic";

import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { LandlordPropertyForm } from "@/components/landlord/LandlordPropertyForm";
import { requireRole } from "@/lib/auth";

export default async function NewLandlordPropertyPage() {
  await requireRole(["LANDLORD"], "/landlord/properties/new");

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader
        title="Add Multi-unit Property"
        description="Use this when one address or complex contains multiple rentable units. For a single-family home, use Add Home instead."
        actionHref="/landlord/properties"
        actionLabel="Back to properties"
      />
      <LandlordPropertyForm />
    </main>
  );
}
