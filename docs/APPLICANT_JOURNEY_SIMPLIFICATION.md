# Applicant Journey Simplification

Version: 4.40.0

Update 3 simplifies the signed-in applicant path from marketplace listing to submitted application.

## What Changed

- Added a dedicated guided apply route at `/applicant/apply/[unitId]`.
- Added reusable packet readiness logic in `src/lib/applicant/packet-readiness.ts`.
- Moved the primary signed-in marketplace CTA to "Review packet and apply."
- Kept a compact one-click authorization form available on the listing page for applicants who already know they are ready.
- Redirected completed marketplace applications to `/applicant/applications?applied=1&applicationId=...`.
- Added a visible applications-list confirmation after the applicant authorizes profile sharing and submits.

## Applicant Flow

1. Applicant opens an active marketplace listing.
2. Applicant chooses "Review packet and apply."
3. HomeBase shows the reusable packet sections that will be shared.
4. Applicant authorizes sharing for that rental team.
5. HomeBase creates or reconnects the application and returns the applicant to the applications list with a clear confirmation.

## Privacy and Permissions

The guided apply page is protected by `requireRole(["APPLICANT", "TENANT"], ...)`. It only loads active public listings and only counts documents uploaded by the signed-in applicant. Landlords still only see packet details through the existing application relationship and authorization note.

## No Fake Data

The readiness panel is derived from the signed-in user's actual applicant profile, household members, income sources, reusable documents, and packet signature state. It does not create fake application readiness numbers.
