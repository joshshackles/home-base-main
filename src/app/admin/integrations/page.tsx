export const dynamic = "force-dynamic";

import { requireRole } from "@/lib/auth";
import { getIntegrationsHubModule } from "@/lib/operations/modules";
import { IntegrationsHubModule } from "@/components/operations/IntegrationsHubModule";
import { createAdminIntegrationConnectionAction, createAdminIntegrationEventAction, updateAdminIntegrationConnectionStatusAction } from "@/app/admin/actions";

export default async function Page() {
  await requireRole(["ADMIN"], "/admin/integrations");
  const data = await getIntegrationsHubModule(undefined);
  return (
    <IntegrationsHubModule
      data={data}
      actions={{
        createConnection: createAdminIntegrationConnectionAction,
        updateConnectionStatus: updateAdminIntegrationConnectionStatusAction,
        createEvent: createAdminIntegrationEventAction
      }}
    />
  );
}
