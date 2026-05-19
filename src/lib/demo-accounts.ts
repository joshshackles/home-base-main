export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || process.env.SEED_DEFAULT_PASSWORD || "DemoPassword123!";

export const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@homebase.local", role: "ADMIN", next: "/admin" },
  { label: "Landlord", email: "landlord@homebase.local", role: "LANDLORD", next: "/landlord" },
  { label: "Inspector", email: "inspector@homebase.local", role: "INSPECTOR", next: "/admin/inspections" },
  { label: "Applicant", email: "applicant@homebase.local", role: "APPLICANT", next: "/applicant" }
] as const;

export function getDemoAccount(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.email === normalizedEmail) ?? null;
}
