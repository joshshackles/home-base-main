# Update 2 — Public Lead Spam Protection

This update hardens the public marketplace inquiry form without changing the database schema.

## Added

- Public form honeypot field named `companyWebsite`
- IP-based public lead rate limiting
- Email-based public lead rate limiting
- Optional Cloudflare Turnstile verification
- Duplicate lead suppression for the same unit/email within 24 hours
- Client IP and user-agent capture for abuse logs
- Environment variables for production CAPTCHA enforcement

## Environment variables

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
TURNSTILE_SECRET_KEY=""
REQUIRE_TURNSTILE="false"
```

For production, set `REQUIRE_TURNSTILE="true"` after adding both Cloudflare Turnstile keys.

## Modified files

```txt
.env.example
src/app/layout.tsx
src/app/marketplace/[unitId]/page.tsx
src/app/marketplace/actions.ts
src/lib/rate-limit.ts
```

## New files

```txt
docs/UPDATE_2_LEAD_SPAM_PROTECTION.md
src/lib/public-form-security.ts
```

## Notes

The existing in-memory limiter is improved for this update, but production serverless deployments should still move rate limits to Redis/Vercel KV/Upstash in the later production rate-limiting update.
