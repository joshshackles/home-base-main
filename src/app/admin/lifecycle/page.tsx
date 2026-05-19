export const dynamic = "force-dynamic";

import { RentalLifecycleBoard } from "@/components/rentals/RentalLifecycleBoard";
import { getRentalLifecycleBoardItems } from "@/lib/rental-lifecycle-board-data";

export default async function AdminLifecyclePage() {
  const items = await getRentalLifecycleBoardItems({ basePath: "admin" });

  return (
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <RentalLifecycleBoard
        title="Platform rental lifecycle engine"
        description="A portfolio-wide operating board that normalizes rental state across listings, applications, leases, residents, notices, maintenance holds, and turnover."
        items={items}
      />
    </main>
  );
}
