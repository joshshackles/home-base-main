import { redirect } from "next/navigation";
import { getVerifiedCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DocumentsRedirectPage() {
  const user = await getVerifiedCurrentUser();
  if (!user) redirect("/login?next=/documents");
  if (user.role === "ADMIN") redirect("/admin/documents");
  if (user.role === "LANDLORD") redirect("/landlord/documents");
  redirect("/applicant/documents");
}
