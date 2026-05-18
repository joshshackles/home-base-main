-- Adds mobile home as a first-class rental type for the unified rental create/edit workflow.
ALTER TYPE "RentalPropertyType" ADD VALUE IF NOT EXISTS 'MOBILE_HOME';
