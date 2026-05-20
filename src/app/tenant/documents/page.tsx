import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantDocumentsRedirectPage() {
  await redirectTenantWorkflow("/applicant/documents");
}
