# Enterprise Public Homepage

Version: 4.37.0

## Purpose

The HomeBase MLS homepage now presents the product as a professional real estate marketplace and housing operations platform for renters, landlords, property managers, housing teams, inspectors, vendors, and administrators.

## Implemented Sections

- Enterprise hero with renter and landlord CTAs.
- Search-focused rental marketplace module connected to `/marketplace`.
- Audience pathways for renters, landlords/managers, housing teams, and inspectors/vendors.
- Marketplace credibility section covering reusable profiles, applications, property/unit management, secure messaging, documents, and role-based dashboards.
- Product preview for application packets, unit health, inspection workflow, and vendor operations.
- Featured listings section powered by live public rental data.
- Trust and security section focused on account access, profile sharing, documents, and communication.
- Final CTA for renters, landlords, and existing users.

## Data Behavior

- Available listing counts and featured listing cards use live database data.
- If the database is unavailable, the homepage shows an honest unavailable state.
- If no listings are published, the page invites renters to open marketplace search and landlords to add listings.
- No fake live listings, user counts, rent totals, or hardcoded marketplace metrics are displayed as real data.

## Routes

- Renter search: `/marketplace`
- Landlord onboarding: `/signup?intent=landlord`
- Existing users: `/login`
- Field portal: `/login?next=%2Fvendor`
