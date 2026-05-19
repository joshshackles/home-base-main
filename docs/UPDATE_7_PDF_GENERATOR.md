# Update 7 — PDF Generator Replacement

This update replaces the hand-built PDF string writer with `pdf-lib`.

## What changed

- `src/lib/pdf.ts` now creates PDFs through a real PDF library.
- PDF metadata is written for generated lease packets and final signed leases.
- Text wrapping now uses font width measurement instead of fixed character counts.
- Long words are split safely instead of overflowing the page.
- Page headers and footers are drawn through the library API.
- The PDF output no longer manually assembles xref tables, objects, or streams.

## Important note about Unicode

The current implementation uses pdf-lib StandardFonts, which are reliable and deployment-safe but limited to WinAnsi text. Characters outside that range are replaced with `□` instead of breaking PDF generation.

For full Unicode rendering, add a licensed embedded font and register it through pdf-lib/fontkit in a later legal-document typography update.

## Files changed

- `package.json`
- `src/lib/pdf.ts`
- `src/app/admin/actions.ts`
- `src/lib/signed-lease.ts`
- `scripts/verify-pdf.ts`
- `docs/UPDATE_7_PDF_GENERATOR.md`
