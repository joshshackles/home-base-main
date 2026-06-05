# Payments Production Hardening

HomeBase v4.21.0 moves payment handling closer to a production-grade Stripe operating model. The goal is to make payment state observable, replay-safe, and reconcilable before landlords close books or issue statements.

## What Changed

- Stripe webhook processing now writes durable `PaymentWebhookEvent` rows keyed by Stripe event id before business logic runs.
- Webhook replays are idempotent: already processed Stripe events return successfully without duplicating ledger entries.
- Ledger payment reconciliation now stores Stripe receipt URLs, receipt numbers, paid timestamps, and refund status.
- Failed payment events update scheduled payment state, retry state, the source ledger entry, and the recovery queue.
- Autopay can pause after repeated exhausted retry cycles so renters and landlords do not silently loop failed payments.
- Refund, dispute, transfer, and payout events are captured as payment events and linked to ledger, dispute, or payout records where possible.
- Landlords have a new reconciliation page at `/landlord/payments/reconciliation`.

## Stripe Events Covered

- `checkout.session.completed`
- `setup_intent.succeeded`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.updated`
- `charge.dispute.closed`
- `transfer.created`
- `transfer.reversed`
- `payout.paid`
- `payout.failed`
- `account.updated`

## Reconciliation View

The landlord reconciliation view highlights:

- collected and outstanding balances
- failed payment recovery attempts
- autopay health and failure counts
- disputes and evidence deadlines
- refund status
- vendor payout status
- missing receipt URLs
- paid ledger records that need review
- recent payment event activity

## Stripe Connect Modernization

HomeBase uses Stripe Connect destination charges for rent collection:

- Tenants pay through the HomeBase platform.
- Funds route to the landlord's connected Stripe account with `transfer_data.destination`.
- HomeBase collects its platform revenue through `application_fee_amount`.
- `STRIPE_PLATFORM_FEE_PERCENT=1` sets the default HomeBase application fee to 1% of the transaction amount.

Connect account creation now runs through `src/lib/payments/stripe-connect.ts` instead of being embedded in a page action. The shared service defines explicit controller settings for the current Stripe SDK path:

- `controller.fees.payer = application`
- `controller.losses.payments = application`
- `controller.requirement_collection = stripe`
- `controller.stripe_dashboard.type = express`

The controller settings make the account responsibility model visible to backend, API, web, and future mobile/admin surfaces. Stripe's `/v2/core/accounts` API should become the next account-creation target when the project upgrades the Stripe SDK/client path that exposes it cleanly.

The landlord payment workspace now shows a Connect readiness checklist for account creation, onboarding, charges, payouts, Stripe requirements, and the active HomeBase platform-fee percentage.

## Platform Fee Governance

Phase 2 introduces `src/lib/payments/platform-fee-policy.ts` as the shared source for HomeBase application-fee rules. The active policy currently resolves from environment configuration, with a safe default of 1%:

- `STRIPE_PLATFORM_FEE_PERCENT=1`
- `STRIPE_PLATFORM_FEE_FIXED_CENTS=0`

Every Stripe rent payment path now builds a `platformFeeSnapshot` before the payment is sent to Stripe. The snapshot includes:

- policy id
- policy label
- policy source
- percentage
- fixed cents
- calculated platform fee amount
- effective date

The snapshot is attached to Stripe Checkout/PaymentIntent metadata and HomeBase payment/audit metadata alongside `application_fee_amount`. This makes support, reconciliation, and future revenue reporting able to prove which fee policy applied to a transaction even if the active policy changes later.

Future phases should persist fee policies and transaction-level fee records in first-class database tables. This pass creates the shared business-logic layer and payment metadata contract first.

## Payment Transaction Records

Phase 3 adds `PaymentTransaction` as the first-class transaction record between Stripe and the HomeBase ledger. Ledger entries still represent accounting charges, payments, credits, and adjustments; payment transactions represent the actual payment-provider attempt and reconciliation record.

Each transaction stores:

- source: Checkout session, scheduled payment, payment retry, or webhook reconciliation
- status: checkout started, processing, succeeded, failed, refunded, disputed, or reconciled
- gross amount
- platform fee amount
- net-to-landlord amount
- Stripe Checkout Session, PaymentIntent, charge, or transfer ids when available
- platform fee policy id and policy snapshot
- tenant, landlord, unit, and ledger links
- idempotency key and failure reason

Checkout, scheduled payments, and failed-payment retries now create or update `PaymentTransaction` records when Stripe payment objects are created. Stripe webhooks then reconcile those records on success, failure, refund, and dispute events.

The landlord payment workspace shows tracked transaction count, tracked platform fees, and failed transaction count as a lightweight operational cue. A future reconciliation phase should turn this into a full transaction ledger with filters, export, dispute/refund drilldowns, and Stripe balance matching.

## Payment Reconciliation Operations

Phase 4 adds `src/lib/payments/payment-reconciliation.ts` as the shared operations layer for payment health. It does not create another payment path. Instead, it reads the durable Stripe webhook inbox and first-class `PaymentTransaction` records created by earlier phases, then classifies what needs human review.

The operations layer now provides:

- a payment transaction ledger for gross amount, HomeBase platform fee, net-to-landlord amount, provider ids, and reconciliation status
- linked Stripe event inbox metrics for processed, processing, failed, and retried webhook events
- exception classification for failed transactions, provider-id gaps, pending reconciliation, failed webhooks, retried webhooks, and platform-fee anomalies
- shared summary helpers that can later power landlord, admin, mobile, and support views without duplicating business logic in page components

The landlord reconciliation page at `/landlord/payments/reconciliation` now surfaces these signals with transaction, linked webhook, fee, and exception sections. This gives operators a clear place to review Stripe webhook failures, platform fee tracking, and payment-provider attempts before owner statements or month-end close.

## Platform Revenue Center

Phase 5 adds `src/lib/payments/platform-revenue.ts` and the admin route `/admin/payments/platform-revenue`. This is the platform-owner view for confirming that HomeBase application-fee revenue is configured and being tracked across Stripe Connect rent payments.

The platform revenue center shows:

- Stripe platform readiness based on `STRIPE_SECRET_KEY`
- webhook readiness based on `STRIPE_WEBHOOK_SECRET`
- the active HomeBase platform fee policy, currently defaulting to 1%
- connected landlord account count for accounts ready to receive transfers
- gross rent volume, HomeBase revenue, net-to-landlord totals, average platform fee, and refund/dispute risk
- monthly platform revenue buckets
- recent fee-bearing payment transactions

This page does not expose Stripe secrets or raw payment credentials. It reads the shared `PaymentTransaction` records and platform fee policy so web, admin, and future reporting surfaces use the same revenue math.

## Verification

Run:

```bash
npm run payments-production:verify
npm run stripe-connect-modernization:verify
npm run platform-fee-governance:verify
npm run payment-transaction-records:verify
npm run payment-reconciliation-ops:verify
npm run platform-revenue-center:verify
```

The verifier checks schema additions, migration coverage, webhook event handling, retry hardening, the landlord reconciliation route, workflow matrix coverage, and release metadata.
