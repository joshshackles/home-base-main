import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantCalendarRedirectPage() {
  await redirectTenantWorkflow("/applicant/calendar");
}
