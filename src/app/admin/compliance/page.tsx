export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getInsuranceComplianceModule } from "@/lib/operations/modules";
import { InsuranceComplianceModule } from "@/components/operations/InsuranceComplianceModule";
import { createAdminCertificationRecordAction, createAdminComplianceInspectionRequirementAction, createAdminInsurancePolicyAction } from "@/app/admin/actions";

export default async function Page() {
  await requireRole(["ADMIN"], "/admin/compliance");
  const data = await getInsuranceComplianceModule(undefined);

  return (
    <InsuranceComplianceModule
      data={data}
      actions={{
        createPolicy: createAdminInsurancePolicyAction,
        createCertification: createAdminCertificationRecordAction,
        createRequirement: createAdminComplianceInspectionRequirementAction
      }}
    />
  );
}
