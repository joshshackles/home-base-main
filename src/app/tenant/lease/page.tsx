import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantLeaseRedirectPage() {
  await redirectTenantWorkflow("/applicant/leases");
}
