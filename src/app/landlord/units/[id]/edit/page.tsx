import { notFound } from "next/navigation";
import { LandlordPageHeader } from "@/components/landlord/LandlordPageHeader";
import { LandlordUnitForm } from "@/components/landlord/LandlordUnitForm";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditLandlordUnitPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["LANDLORD"], "/landlord");
  const unit = await prisma.unit.findFirst({
    where: { id: params.id, property: { ownerId: user.userId, isArchived: false }, NOT: { status: "ARCHIVED" } },
    include: { property: true }
  });

  if (!unit) notFound();

  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <LandlordPageHeader title={`Edit ${unit.property.name} #${unit.unitNumber}`} description="Update listing details that applicants see in the marketplace." actionHref="/landlord/units" actionLabel="Back to units" />
      <LandlordUnitForm unit={unit} />
    </main>
  );
}
