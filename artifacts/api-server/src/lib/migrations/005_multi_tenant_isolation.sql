-- Migration 005: Multi-tenant isolation
-- 1. Add company_code (unique short code) to companies
-- 2. Add UNIQUE(company_id, username) to employees
-- Safe: uses IF NOT EXISTS / IF NOT EXISTS patterns

-- 1. Add company_code column
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_code TEXT;

-- 2. Generate codes for existing companies that don't have one
-- Format: 4 uppercase letters + hyphen + 4 digits (e.g. ATND-1001)
UPDATE companies
SET company_code = UPPER(
  CHR(65 + (id * 7  % 26)) ||
  CHR(65 + (id * 13 % 26)) ||
  CHR(65 + (id * 17 % 26)) ||
  CHR(65 + (id * 23 % 26)) ||
  '-' ||
  LPAD(CAST((1000 + id * 97) % 9000 + 1000 AS TEXT), 4, '0')
)
WHERE company_code IS NULL;

-- 3. Add unique constraint on company_code
ALTER TABLE companies ADD CONSTRAINT IF NOT EXISTS companies_company_code_key UNIQUE (company_code);

-- 4. Add UNIQUE(company_id, username) to employees — prevents same username in same company
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_company_id_username_key;
ALTER TABLE employees ADD CONSTRAINT employees_company_id_username_key UNIQUE (company_id, username);
