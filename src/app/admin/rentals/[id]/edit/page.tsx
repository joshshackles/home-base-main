import { redirect } from "next/navigation";

export default function AdminRentalEditRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/units/${params.id}/edit`);
}
