import { redirect } from "next/navigation";

export default function LandlordRentalEditRedirect({ params }: { params: { id: string } }) {
  redirect(`/landlord/units/${params.id}/edit`);
}
