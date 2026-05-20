import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantTasksRedirectPage() {
  await redirectTenantWorkflow("/applicant/tasks");
}
