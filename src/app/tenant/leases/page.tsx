import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantLeasesRedirectPage() {
  await redirectTenantWorkflow("/applicant/leases");
}
