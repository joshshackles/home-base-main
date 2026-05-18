export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getInsuranceComplianceModule } from "@/lib/operations/modules";
import { InsuranceComplianceModule } from "@/components/operations/InsuranceComplianceModule";
import { createLandlordCertificationRecordAction, createLandlordComplianceInspectionRequirementAction, createLandlordInsurancePolicyAction } from "@/app/landlord/actions";

export default async function Page() {
  const user = await requireRole(["LANDLORD"], "/landlord/compliance");
  const data = await getInsuranceComplianceModule(user.userId);

  return (
    <InsuranceComplianceModule
      data={data}
      actions={{
        createPolicy: createLandlordInsurancePolicyAction,
        createCertification: createLandlordCertificationRecordAction,
        createRequirement: createLandlordComplianceInspectionRequirementAction
      }}
    />
  );
}
