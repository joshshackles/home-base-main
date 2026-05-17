export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || process.env.SEED_DEFAULT_PASSWORD || "DemoPassword123!";

export const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@homebase.local", next: "/admin" },
  { label: "Landlord", email: "landlord@homebase.local", next: "/landlord" },
  { label: "Applicant", email: "applicant@homebase.local", next: "/applicant" }
] as const;
