import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantNotificationsRedirectPage() {
  await redirectTenantWorkflow("/applicant/notifications");
}
