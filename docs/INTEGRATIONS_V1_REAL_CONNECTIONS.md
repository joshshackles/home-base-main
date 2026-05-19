# Integrations v1 Real Connections

HomeBase v4.25.0 turns the integrations hub from readiness notes into the first real operating layer for Stripe, transactional email, and QuickBooks.

## Providers included first

- Stripe: uses the existing Stripe webhook route and payment processor, then records integration connection events for webhook receipt, success, and retryable failure.
- Email provider: adds a shared `/api/webhooks/email` delivery webhook for SendGrid or Postmark style events. API credentials stay in environment variables.
- QuickBooks: adds OAuth start and callback routes, realm capture, webhook receipt logging, and external-token lifecycle metadata.

## Token lifecycle

HomeBase does not store raw OAuth access tokens, refresh tokens, API keys, webhook secrets, or client secrets in `IntegrationConnection.configJson`.

The database stores lifecycle metadata only:

- OAuth state hash and callback path while an authorization attempt is active.
- Provider, realm, connected timestamp, and authorization code hash after callback.
- Flags showing whether raw access or refresh tokens are stored externally.
- Retry metadata on failed integration events.

Production token exchange should run in a secure token worker or vault-backed service that receives the QuickBooks callback code, exchanges it with Intuit, and stores the raw token material outside the application database.

## Routes

- `/api/stripe/webhook`: existing Stripe payment webhook, now also logs integration events.
- `/api/webhooks/email`: SendGrid/Postmark delivery event endpoint.
- `/api/integrations/quickbooks/start?connectionId=...`: starts QuickBooks OAuth for an admin or the owning landlord.
- `/api/integrations/quickbooks/callback`: handles the QuickBooks OAuth redirect and records realm/token lifecycle metadata.
- `/api/webhooks/quickbooks`: receives QuickBooks accounting change events and queues sync logs.

## Admin diagnostics

The integrations control center now shows:

- Real v1 provider badges for Stripe, SendGrid, Postmark, and QuickBooks.
- Live connection cards for the first real providers.
- Webhook, OAuth, retryable failure, and sync/diagnostic event counters.
- Real provider diagnostics through the existing diagnostic form.

## Environment checklist

Stripe:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` optional
- `STRIPE_ACCOUNT_ID` optional

Email:

- `SENDGRID_API_KEY` and `EMAIL_FROM`, or `POSTMARK_SERVER_TOKEN` and `EMAIL_FROM`
- `EMAIL_WEBHOOK_SECRET`, `POSTMARK_WEBHOOK_SECRET`, or `SENDGRID_WEBHOOK_PUBLIC_KEY` for webhook verification

QuickBooks:

- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`
- `QUICKBOOKS_REDIRECT_URI`
- `QUICKBOOKS_ENV`
- `QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN`

In production, webhook endpoints reject unsigned requests when the matching shared secret is not configured.

## Verification

Run:

```bash
npm run integrations-v1-real:verify
```

The verifier checks release metadata, the real integration library, webhook/OAuth routes, diagnostics wiring, UI metrics, docs, and package script registration.
