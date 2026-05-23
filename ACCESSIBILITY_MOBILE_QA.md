# Accessibility and Mobile QA Checklist

This pass focuses on the highest-risk workflows after the enterprise UX updates. Playwright is configured in this repo, but automated axe checks were not added in this workspace because the local `npm` executable is not available and dependencies cannot be installed or verified here. When the toolchain is available, add `@axe-core/playwright` and run it against the routes below.

## Priority Routes

- Public marketplace: `/marketplace`
- Listing detail: `/marketplace/[unitId]`
- Renter profile wizard: `/applicant/profile`
- Application stepper: `/applicant/apply/[unitId]`
- Tenant payments: `/tenant/payments`
- Tenant maintenance request: `/tenant/maintenance`
- Landlord inventory: `/landlord/inventory`
- Unit workspace: `/landlord/units/[unitId]/workspace`
- Vendor field mode: `/vendor/field`
- Inspector checklist: `/inspector/inspections/[id]`
- Owner portal: `/owner`
- Participant dashboard: `/participant`
- Caseworker queue: `/caseworker`
- Admin command center: `/admin/command-center`

## Manual Keyboard Checks

- Tab from the top of each dashboard and confirm the skip link reaches the main content.
- Open and close mobile navigation with keyboard only; focus should move into the drawer and return to the opener.
- Open and close the command palette with keyboard only; focus should move into the dialog and return to the opener.
- Confirm visible focus styles on dashboard navigation, command actions, icon buttons, CTAs, tabs, filters, form fields, and mobile sticky actions.
- Confirm dialogs and drawers close with Escape and do not trap focus after closing.

## Forms and Error States

- Every visible input, select, textarea, and file control needs a programmatic label.
- Required controls should be visually indicated and announced through native `required` or linked error text.
- Use `FieldError` for field-level errors so assistive tech receives `role="alert"`.
- Error copy should explain how to fix the problem, not only that the submission failed.
- File upload errors should mention supported file types and size limits.

## Tables and Mobile Layout

- Record-heavy pages should use `ResponsiveRecordList` or an equivalent pattern: desktop table, mobile cards.
- Table regions should have a meaningful label and caption.
- Mobile cards should include the record title, key status, three to five important fields, and primary action.
- Avoid horizontal scrolling on role-critical mobile pages unless the table is a secondary accounting/admin detail.
- Tap targets should be at least 44px high for primary actions and navigation.

## Status, Badges, and Icons

- Do not rely on color alone for state. Badges must include text such as `Pending`, `Overdue`, `Approved`, or `Needs review`.
- Icon-only buttons need `aria-label` values that include the action and record context where possible.
- Loading states should announce what is loading and avoid layout jumps.
- Empty states should explain what is missing and provide the next safe action.

## Media and Listing Images

- Listing images need descriptive alt text based on the property/listing context.
- Decorative icons should remain hidden from screen readers when they do not add meaning.
- Maintenance, inspection, and vendor media links should expose filename or evidence context.

## Automated Follow-Up

Recommended Playwright accessibility helper once dependencies are available:

```ts
import AxeBuilder from "@axe-core/playwright";

const accessibilityScanResults = await new AxeBuilder({ page })
  .include("main")
  .analyze();

expect(accessibilityScanResults.violations).toEqual([]);
```

Start with smoke scans for the priority routes, then add form-specific checks for listing inquiries, renter profile, applications, tenant maintenance, vendor field updates, and inspector checklist submission.
