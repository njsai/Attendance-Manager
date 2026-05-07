-- Migration 004: Add preferred_theme and preferred_lang columns to employees
-- Safe: uses ADD COLUMN IF NOT EXISTS — no data loss

ALTER TABLE employees ADD COLUMN IF NOT EXISTS preferred_theme TEXT NOT NULL DEFAULT 'dark';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS preferred_lang  TEXT NOT NULL DEFAULT 'ar';
