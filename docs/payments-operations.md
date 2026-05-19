# Rental Payment Operations

Version 3.3.0 expands payments from basic Stripe checkout into a rental financial operations layer.

## Included

- Stripe Connect landlord onboarding remains the payout foundation.
- Tenant wallet page at `/applicant/payments` for bank/card setup through Stripe Checkout setup mode.
- Saved payment method records store only Stripe IDs, type, last4, brand/bank name, verification status, and nickname metadata.
- Scheduled payment records support one-time and autopay-style scheduled payments.
- Landlord payment command center at `/landlord/payments` includes received payment metrics, outstanding balances, scheduled payment totals, Stripe status, rent policy editing, and late-fee application.
- Unit rent billing policy supports rent amount, due day, grace period, late fee mode, flat/percent/daily fee inputs, partial-pay and autopay flags.
- Payment events provide a financial timeline for method setup, scheduled payment creation/cancellation, failed payments, successful payments, rent adjustments, and late fees.
- Stripe webhook handling now records payment events, stores verified payment methods from setup intents, and tracks payment failures.
- Cron route `/api/cron/process-payments` processes due scheduled payments with optional `CRON_SECRET` protection.
- Checkout, setup, Connect onboarding, scheduled PaymentIntent, retry PaymentIntent, and refund calls use idempotency keys so duplicate submissions are safer.
- Off-session scheduled payments and recovery retries are only posted as paid after Stripe returns a succeeded PaymentIntent; processing intents remain in a processing state until webhook reconciliation.

## Required environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_URL` or `NEXT_PUBLIC_APP_URL`
- optional `NEXT_PUBLIC_STRIPE_ENABLED=false` to disable UI actions
- optional `STRIPE_PLATFORM_FEE_PERCENT`
- optional `STRIPE_PLATFORM_FEE_FIXED_CENTS`
- optional `CRON_SECRET`

## Best-practice notes

- Never store raw bank details. Stripe owns sensitive account/card data.
- Use webhook events as the source of truth for final payment status.
- Keep dynamic payment methods enabled in Stripe Dashboard instead of hard-coding card-only Checkout flows.
- Keep scheduled payments idempotent and auditable.
- Prefer ACH/bank rails for rent and card rails as backup.
- Late-fee rules should be reviewed by state/local counsel before production enforcement.
