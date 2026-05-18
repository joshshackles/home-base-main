export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getIntegrationsHubModule } from "@/lib/operations/modules";
import { IntegrationsHubModule } from "@/components/operations/IntegrationsHubModule";
import { createLandlordIntegrationConnectionAction, createLandlordIntegrationEventAction, createLandlordQuickBooksConnectionAction, runLandlordIntegrationDiagnosticAction, updateLandlordIntegrationConnectionStatusAction } from "@/app/landlord/actions";

export default async function Page() {
  const user = await requireRole(["LANDLORD"], "/landlord/integrations");
  const data = await getIntegrationsHubModule(user.userId);
  return (
    <IntegrationsHubModule
      data={data}
      actions={{
        createConnection: createLandlordIntegrationConnectionAction,
        updateConnectionStatus: updateLandlordIntegrationConnectionStatusAction,
        createEvent: createLandlordIntegrationEventAction,
        runDiagnostic: runLandlordIntegrationDiagnosticAction,
        createQuickBooksConnection: createLandlordQuickBooksConnectionAction
      }}
    />
  );
}
