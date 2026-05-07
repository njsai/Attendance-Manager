-- Add location_verification_enabled column to branches table
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS location_verification_enabled boolean NOT NULL DEFAULT false;
