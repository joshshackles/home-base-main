import { redirectTenantWorkflow } from "../_redirects";

export default async function TenantLedgerRedirectPage() {
  await redirectTenantWorkflow("/applicant/ledger");
}
