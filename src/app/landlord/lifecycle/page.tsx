export const dynamic = "force-dynamic";

import { RentalLifecycleBoard } from "@/components/rentals/RentalLifecycleBoard";
import { requireRole } from "@/lib/auth";
import { getRentalLifecycleBoardItems } from "@/lib/rental-lifecycle-board-data";

export default async function LandlordLifecyclePage() {
  const user = await requireRole(["LANDLORD"], "/landlord/lifecycle");
  const items = await getRentalLifecycleBoardItems({ ownerId: user.userId, basePath: "landlord" });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <RentalLifecycleBoard
        title="Rental lifecycle engine"
        description="One operating board for every rental: setup, market, application, lease, move-in, resident, renewal, notice, turnover, and hold."
        items={items}
      />
    </main>
  );
}
