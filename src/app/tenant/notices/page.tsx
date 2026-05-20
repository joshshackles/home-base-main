import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantNoticesRedirectPage() {
  await redirectTenantWorkflow("/applicant/notices");
}
