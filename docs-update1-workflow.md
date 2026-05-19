# Workflow Update 1 — Auth + Applicant Onboarding

This update adds the first large workflow improvement package:

- Database-backed revokable sessions for new logins
- Legacy cookie session compatibility during rollout
- Applicant self-signup
- Automatic application linking by applicant email during signup
- Secure application claim links for applicants who start as marketplace leads
- Admin claim-link generation from the application detail screen
- Claim-link landing flow that creates or connects applicant portal accounts

## Vercel/Hobby notes

The workflow remains compatible with Vercel Hobby. Claim links are generated synchronously by admins and do not require background jobs. Email delivery can still be manual or daily cron until production upgrades to Pro.

## Rollout notes

Run migrations before deploying:

```bash
npx prisma migrate deploy
```

New sessions are stored in `UserSession`. Existing legacy HMAC cookie sessions remain readable during the rollout window, but new logins use database-backed sessions.
