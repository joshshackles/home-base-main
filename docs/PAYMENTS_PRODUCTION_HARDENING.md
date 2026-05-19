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

## Verification

Run:

```bash
npm run payments-production:verify
```

The verifier checks schema additions, migration coverage, webhook event handling, retry hardening, the landlord reconciliation route, workflow matrix coverage, and release metadata.
