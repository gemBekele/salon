-- Branch daily expense limit (ETB) — set by salon admin, enforced for receptionist expense recording
ALTER TABLE "branches"
  ADD COLUMN IF NOT EXISTS "daily_expense_limit_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0;
