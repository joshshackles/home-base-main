import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

export async function redirectTenantWorkflow(target: string) {
  await requireRole(["TENANT"], "/tenant");
  redirect(target);
}
