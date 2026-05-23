export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { UnitPropertyWorkspace } from "@/components/landlord/unit-workspace/UnitPropertyWorkspace";
import { normalizeUnitWorkspaceTab } from "@/components/landlord/unit-workspace/UnitWorkspaceTabs";
import { requireRole } from "@/lib/auth";
import { getLandlordUnitWorkspaceModel, platformContext } from "@/lib/platform";
import { resolveLandlordUnitWorkspaceEngine } from "@/lib/workspace";

type PageSearchParams = Record<string, string | string[] | undefined>;

function getSearchParam(searchParams: PageSearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LandlordUnitDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: PageSearchParams }) {
  const user = await requireRole(["LANDLORD"], "/landlord");
  // Platform service preserves the legacy workspace safety constraints: ownerId: user.userId and NOT: { status: "ARCHIVED" }.
  const ctx = platformContext(user, { source: "web" });
  const workspace = await getLandlordUnitWorkspaceModel(ctx, { unitId: params.id });
  if (!workspace) notFound();
  const activeTab = normalizeUnitWorkspaceTab(getSearchParam(searchParams, "tab"));
  const engine = resolveLandlordUnitWorkspaceEngine({ actor: ctx.actor, workspace, activeTab });

  return <UnitPropertyWorkspace workspace={workspace} activeTab={activeTab} engine={engine} />;
}
