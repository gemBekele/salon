-- Migration 004: Add UNIQUE constraint on customers(company_id, phone)
-- Prevents duplicate customer phone numbers within the same tenant.

-- First, clean up any duplicate phone numbers within the same company (keep the oldest)
DELETE c1 FROM customers c1
  INNER JOIN customers c2
  ON c1.company_id = c2.company_id
    AND c1.phone = c2.phone
    AND c1.created_at > c2.created_at;

ALTER TABLE customers ADD UNIQUE KEY uk_customers_company_phone (company_id, phone);
