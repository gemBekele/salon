-- 008 - Commission payout records (one row per accepted payout moment)
CREATE TABLE IF NOT EXISTS "commission_payouts" (
  "id" VARCHAR(50) NOT NULL,
  "company_id" VARCHAR(50) NOT NULL,
  "branch_id" VARCHAR(50) NULL,
  "staff_id" VARCHAR(50) NOT NULL,
  "staff_name" VARCHAR(150) NOT NULL,
  "amount_accepted_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "logs_paid" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_cp_company" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_cp_staff" FOREIGN KEY ("staff_id") REFERENCES "staff" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_commission_payouts_staff" ON "commission_payouts" ("staff_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_commission_payouts_company" ON "commission_payouts" ("company_id", "created_at");