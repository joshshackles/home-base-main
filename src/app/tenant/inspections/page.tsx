import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantInspectionsRedirectPage() {
  await redirectTenantWorkflow("/applicant/inspections");
}
