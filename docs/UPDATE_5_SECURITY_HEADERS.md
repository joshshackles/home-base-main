# Update 5 — Security Headers

This update adds production security headers at the Next.js configuration layer.

## Added headers

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`

## Why this matters

The previous configuration did not define a header policy, leaving the app more exposed to clickjacking, content-sniffing, overly broad browser APIs, and missing transport-security enforcement.

## Compatibility notes

The CSP is intentionally compatible with the current Next.js app and Tailwind setup:

- Inline styles remain allowed because the app uses framework-generated inline styling.
- Inline scripts remain allowed for Next.js runtime compatibility.
- `unsafe-eval` is only included outside production.
- Images allow `self`, `data:`, `blob:`, and HTTPS sources for uploaded assets and marketplace media.

A stricter nonce-based CSP can be added later after all pages are audited for inline script/style usage.

## Files changed

- `next.config.mjs`
- `scripts/verify-security.ts`
- `docs/UPDATE_5_SECURITY_HEADERS.md`
- `CHANGELOG.md`
- `README.md`

## Verification

Run:

```bash
npm run security:verify
npm run typecheck
npm run build
```

After deployment, confirm headers with:

```bash
curl -I https://your-domain.example
```
