export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { UserNotificationsPage } from "@/components/notifications/UserNotificationsPage";

export default async function TenantNotificationsPage() {
  const user = await requireRole(["TENANT"], "/tenant/notifications");
  return UserNotificationsPage({
    userId: user.userId,
    title: "Resident notifications",
    description: "Review lease, rent, maintenance, notice, inspection, document, and account alerts for your home."
  });
}
