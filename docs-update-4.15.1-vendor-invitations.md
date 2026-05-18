# v4.15.1 Vendor Invitation Onboarding

This update lets landlords add vendors before the vendor has a HomeBase account.

## What changed

- Added a `VendorInvitation` record with a secure hashed invite token.
- Added a landlord/admin form to invite an external vendor by email.
- Sends the vendor a secure signup link using the configured email provider.
- Signup through the invite validates the token and email address.
- Accepted invites automatically create vendor access, vendor profile, vendor relationship connection, and vendor portal access.
- Added `UserRole.VENDOR` so accepted vendors have a clear account type.
- Existing account holders can still be connected with the existing “Enable vendor access” workflow.

## Flow

1. Landlord opens Vendors.
2. Landlord enters company, contact, email, trade, insurance/license/rental scope.
3. HomeBase creates a pending vendor invitation and sends an email.
4. Vendor clicks the signup link.
5. Signup creates the account and accepts the invite.
6. The user is routed to `/vendor` and can manage jobs/invoices.

## Notes

- Invites expire after 14 days.
- Invite tokens are stored hashed.
- Existing users are not duplicated; landlords should connect existing users with the existing vendor access form.
