import { existsSync, readFileSync } from "fs";

const required = [
  "model VendorInvitation",
  "VENDOR",
  "inviteExternalVendor",
  "acceptVendorInvitation",
  "vendorInviteSignupUrl",
  "Create Vendor Account",
  "VendorInvitation_tokenHash_key"
];

const files = [
  "prisma/schema.prisma",
  "src/app/vendor-actions.ts",
  "src/lib/vendor-invitations.ts",
  "src/app/signup/actions.ts",
  "src/app/signup/page.tsx",
  "src/components/vendors/VendorCenterView.tsx",
  "prisma/migrations/20260518210000_vendor_invitation_onboarding/migration.sql"
];

for (const file of files) {
  if (!existsSync(file)) throw new Error(`Missing vendor invitation file: ${file}`);
}

const haystack = files.map((file) => readFileSync(file, "utf8")).join("\n");
for (const needle of required) {
  if (!haystack.includes(needle)) throw new Error(`Vendor invitation update is missing ${needle}`);
}

console.log("Vendor invitation onboarding verification passed.");
