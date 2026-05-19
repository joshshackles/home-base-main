-- Expand relationship roles so the Relationship Lifecycle Engine can represent the full operational contact network.
ALTER TYPE "ConnectionRole" ADD VALUE IF NOT EXISTS 'HOUSING_COORDINATOR';
ALTER TYPE "ConnectionRole" ADD VALUE IF NOT EXISTS 'MAINTENANCE_WORKER';
ALTER TYPE "ConnectionRole" ADD VALUE IF NOT EXISTS 'VENDOR';
ALTER TYPE "ConnectionRole" ADD VALUE IF NOT EXISTS 'EMERGENCY_CONTACT';
ALTER TYPE "ConnectionRole" ADD VALUE IF NOT EXISTS 'SUPPORT_CONTACT';
