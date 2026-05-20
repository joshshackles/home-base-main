import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantMaintenanceRedirectPage() {
  await redirectTenantWorkflow("/applicant/maintenance");
}
