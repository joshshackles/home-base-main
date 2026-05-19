# Marketplace Application & Lead Reply UX

Version: 4.32.0

## Goal

Make applying for a home feel like an account-aware marketplace action instead of a cold public lead form. A signed-in applicant should be able to open a rental, authorize sharing their saved renter packet, optionally add a note, and start or continue the application in a few clicks.

## Applicant Marketplace Changes

- Signed-in applicants now see a Fast apply panel on each rental detail page.
- The panel shows profile, household/income detail count, and reusable document count as confidence signals.
- Applicants must explicitly authorize sharing their saved renter profile, contact details, household, income, and reusable documents with the rental team.
- The saved renter packet now includes Phase 2 application details and acknowledgements from the applicant profile.
- If the applicant already has a non-withdrawn application for the home, the page routes them to continue it instead of creating a duplicate.
- Applicants can ask a lightweight question from the same panel without retyping name and email.
- The full public lead form remains available for signed-out visitors.

## Landlord Reply Changes

- Landlords can reply from the lead detail page while viewing the original question.
- Replies are sent through the existing email delivery helper, so console, webhook, Resend, and disabled-provider behavior remain centralized.
- Sending a reply marks the lead as contacted, writes an audit event, and stores the reply body in the lead timeline.
- A mailto fallback is available for landlords who prefer their local email client.

## Verification

Run:

```bash
npm run marketplace-application-ux:verify
```

This marker check confirms the signed-in fast apply action, authorization copy, marketplace question flow, landlord reply action, timeline logging, version metadata, and documentation are present.
