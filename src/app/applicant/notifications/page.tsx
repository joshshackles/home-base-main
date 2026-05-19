export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/auth";
import { UserNotificationsPage } from "@/components/notifications/UserNotificationsPage";

export default async function ApplicantNotificationsPage() {
  const user = await requireUser("/applicant/notifications");
  return UserNotificationsPage({ userId: user.userId, title: "Renter notifications", description: "Review application, lease, rent, maintenance, tour, and account alerts in one place." });

}
