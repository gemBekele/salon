-- Migration 004: Add UNIQUE constraint on customers(company_id, phone)
-- Prevents duplicate customer phone numbers within the same tenant.

-- First, clean up any duplicate phone numbers within the same company (keep the oldest)
DELETE FROM "customers" c1
USING "customers" c2
WHERE c1."company_id" = c2."company_id"
  AND c1."phone" = c2."phone"
  AND c1."created_at" > c2."created_at";

ALTER TABLE "customers"
  ADD CONSTRAINT "uk_customers_company_phone" UNIQUE ("company_id", "phone");
