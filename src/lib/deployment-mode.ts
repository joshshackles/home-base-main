export type DeploymentPlan = "hobby" | "pro" | "custom";

export function deploymentPlan(): DeploymentPlan {
  const raw = (process.env.VERCEL_PLAN || process.env.HOMEBASE_DEPLOYMENT_PLAN || "hobby").toLowerCase();
  if (raw === "pro") return "pro";
  if (raw === "custom") return "custom";
  return "hobby";
}

export function isHobbyMode() {
  return deploymentPlan() === "hobby";
}

export function emailProcessingModeLabel() {
  if (isHobbyMode()) return "Hobby daily queue mode";
  return "Production queue mode";
}

export function emailProcessingDescription() {
  if (isHobbyMode()) {
    return "Vercel Hobby cron runs once daily, so queued email is processed overnight unless an admin uses Send Queued Emails now.";
  }

  return "Queued email can be processed by more frequent cron jobs in this deployment mode.";
}
