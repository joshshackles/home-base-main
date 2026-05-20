import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantPaymentsRedirectPage() {
  await redirectTenantWorkflow("/applicant/payments");
}
