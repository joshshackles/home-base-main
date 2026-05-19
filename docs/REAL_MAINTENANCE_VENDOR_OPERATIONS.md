# Real Maintenance/Vendor Operations

HomeBase v4.24.0 makes maintenance and vendor work operational instead of just trackable.

## What changed

- Assignment queues separate unassigned work, vendor acceptance, and SLA-risk jobs.
- Vendors can accept assigned jobs from mobile field mode.
- Vendors can upload maintenance field photos as rental documents.
- Vendors can submit estimates before invoicing.
- Landlords can review estimates/invoices, approve them, and prepare payout records.
- Payout eligibility is surfaced for approved invoices that have not yet been tied to a payout.
- SLA tracking uses priority-based targets for urgent, high, normal, and low priority work.
- Recurring maintenance tasks can be created for preventive work.
- Vendor portal now prioritizes mobile field actions: accept, photo, estimate, status update, complete, invoice.

## Workflow intent

The maintenance system now answers:

1. What is unassigned?
2. What is waiting on vendor acceptance?
3. What is at SLA risk?
4. What proof or field update has the vendor supplied?
5. What estimate or invoice needs approval?
6. Which invoices are payout eligible?
7. What preventive maintenance is scheduled?

## Verification

Run:

```bash
npm run maintenance-vendor-operations:verify
```
