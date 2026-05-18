# Update 12.8 — Unified Rental Records

This update changes the inventory workflow so users create and manage one rental record instead of separately creating a property and then a unit.

## What changed

- Admin and landlord create/edit screens now ask for the rental address, rental name, rental number/name, type, pricing, status, and listing details in one form.
- Rental type is selected directly on the rental record: single-family home, duplex, apartment, mobile home, condo, townhouse, room, commercial, or other.
- The old Property Groups navigation item is removed from admin and landlord sidebars.
- Legacy property routes redirect to the Rentals workflow to prevent users from managing properties and units as separate objects.
- Existing data remains compatible because HomeBase still keeps the internal `Property` table for relationships, reports, documents, compliance, and multi-record associations.
- Creating a rental automatically creates the internal property/location record behind the scenes.
- Editing a rental also updates the attached internal property/location address and owner assignment.

## Why the schema still has Property and Unit

The app has many existing relationships tied to property-level records: documents, tasks, notices, insurance, compliance, inventory, reports, and owner scoping. Removing the table outright would require a much larger migration and risk data loss. This update unifies the user workflow while preserving the internal structure needed for compatibility.

## Migration

Adds `MOBILE_HOME` to `RentalPropertyType`.
