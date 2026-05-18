import { redirect } from "next/navigation";

export default function AdminRentalDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/units/${params.id}`);
}
