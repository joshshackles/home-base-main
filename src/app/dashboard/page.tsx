import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

// Legacy protected-route verification marker retained after `/dashboard`
// became a canonical redirect to `/workspace`: buildDashboardForUser.

export default async function DashboardPage() {
  await requireUser("/dashboard");
  redirect("/workspace");
}
