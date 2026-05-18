import { redirect } from "next/navigation";

export default function DeprecatedEditPropertyPage() {
  redirect("/admin/rentals");
}
