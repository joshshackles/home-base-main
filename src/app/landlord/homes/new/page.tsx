import { redirect } from "next/navigation";

export default function DeprecatedNewHomePage() {
  redirect("/landlord/rentals/new");
}
