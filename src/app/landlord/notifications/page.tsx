export const dynamic = "force-dynamic";
import { requireRole } from "@/lib/auth";
import { UserNotificationsPage } from "@/components/notifications/UserNotificationsPage";

export default async function LandlordNotificationsPage() {
  const user = await requireRole(["LANDLORD"], "/landlord/notifications");
  return <UserNotificationsPage userId={user.userId} title="Landlord notifications" description="Track payment, leasing, maintenance, marketplace, and platform alerts that need landlord attention." />;
}
