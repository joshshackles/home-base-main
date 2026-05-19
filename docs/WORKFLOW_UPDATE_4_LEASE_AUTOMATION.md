# Workflow Update 4 — Lease Automation and Cleanup

This update improves lease packet workflow clarity and completion automation.

## Added

- Admin lease timeline for draft, approval, signature, completion, and final signed PDF generation.
- Manual **Refresh Automation** action to re-check completion state and generate the final signed PDF when signatures are complete.
- Idempotent lease completion helper in `src/lib/signed-lease.ts`.
- Expired signature renewal action with a fresh expiration window and queued initial notification.
- Landlord e-signature consent capture and hashing parity with tenant signatures.
- Applicant and landlord lease progress cards.
- v1.7.4 version consistency updates.

## Notes

Final signed PDF generation remains tied to completed signature evidence. If a lease has an expired or declined request, admins should renew the expired request or void and reissue the packet.
