import { redirect } from "next/navigation";

export default function DeprecatedNewPropertyPage() {
  redirect("/admin/rentals/new");
}
