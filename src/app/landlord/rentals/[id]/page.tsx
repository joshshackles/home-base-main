import { redirect } from "next/navigation";

export default function LandlordRentalDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/landlord/units/${params.id}`);
}
