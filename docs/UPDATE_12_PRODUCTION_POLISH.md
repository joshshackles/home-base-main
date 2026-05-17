# Update 12 — Production Polish and Compliance Readiness

This update completes the first hardening cycle with final cleanup and public-launch polish.

## Included

- Centralized app version helper sourced from `package.json`.
- Replaced stale hardcoded version strings in admin/system surfaces.
- Added public legal/compliance starter pages: Privacy, Terms, Fair Housing, Accessibility.
- Added footer links to legal/compliance pages.
- Added skip-to-content accessibility link.
- Added richer root metadata/Open Graph defaults.
- Added `robots.ts` and `sitemap.ts`.
- Expanded upload support for HEIC/HEIF, CSV, and XLSX with basic signature validation.
- Added `scripts/verify-update12.ts` and `npm run update12:verify`.

## Still requires human review

The legal/compliance pages are intentionally starter text. Review them with counsel before public launch.

## Recommended checks

```bash
npm install
npm run update12:verify
npm run verify
npm run build
```
