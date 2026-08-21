-- 011 - Role rework: receptionist -> reception, tenant_manager -> manager, new owner role
-- Owner is the top tenant role (salon owner) with the same management powers as
-- super_admin within their company. Each constraint is DROPPED *before* the data
-- rename (the old CHECK would otherwise reject the new values), then re-added
-- with the full, final role set.

-- users table (login role)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_check";
UPDATE "users" SET "role" = 'reception' WHERE "role" = 'receptionist';
UPDATE "users" SET "role" = 'manager' WHERE "role" = 'tenant_manager';
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('super_admin', 'owner', 'manager', 'reception', 'staff'));

-- staff table (functional role used by queue boards / TV display)
ALTER TABLE "staff" DROP CONSTRAINT IF EXISTS "staff_role_check";
UPDATE "staff" SET "role" = 'reception' WHERE "role" = 'receptionist';
ALTER TABLE "staff" ADD CONSTRAINT "staff_role_check" CHECK ("role" IN ('reception', 'barber', 'hairstylist', 'masseuse', 'esthetician', 'manager'));