import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantInboxRedirectPage() {
  await redirectTenantWorkflow("/applicant/inbox");
}
