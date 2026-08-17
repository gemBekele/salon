-- 005 - Staff PIN login support (4-digit PIN for staff terminals)
-- PINs are stored scrypt-hashed (see server-lib/auth.ts). Default PINs are
-- auto-generated (last 4 digits of the staff phone number) and staff are
-- forced to change them on first login (pin_changed = FALSE).

ALTER TABLE "staff" ADD COLUMN "pin_hash" VARCHAR(255) NULL;
ALTER TABLE "staff" ADD COLUMN "pin_changed" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "staff" ADD COLUMN "pin_failed_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "staff" ADD COLUMN "pin_locked_until" TIMESTAMP NULL;
