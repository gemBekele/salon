-- 009 - Feature expansion: banks, bundles, material sales, payments, groups, feedback
-- Target: PostgreSQL

-- 1. Configurable banks (manager/owner managed list)
CREATE TABLE "banks" (
  "id" VARCHAR(50) NOT NULL,
  "company_id" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "uq_banks_company_code" UNIQUE ("company_id", "code"),
  CONSTRAINT "fk_banks_company" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE
);

-- 2. Bundle services (per-sub-service prices define the bundle total)
CREATE TABLE "service_bundles" (
  "id" VARCHAR(50) NOT NULL,
  "company_id" VARCHAR(50) NOT NULL,
  "branch_id" VARCHAR(50) NULL,
  "business_unit_id" VARCHAR(50) NULL,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_bundle_company" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_bundle_branch" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_bundle_bu" FOREIGN KEY ("business_unit_id") REFERENCES "business_units" ("id") ON DELETE SET NULL
);

CREATE TABLE "service_bundle_items" (
  "id" VARCHAR(50) NOT NULL,
  "bundle_id" VARCHAR(50) NOT NULL,
  "service_id" VARCHAR(50) NOT NULL,
  "price_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY ("id"),
  CONSTRAINT "uq_bundle_service" UNIQUE ("bundle_id", "service_id"),
  CONSTRAINT "fk_sbi_bundle" FOREIGN KEY ("bundle_id") REFERENCES "service_bundles" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_sbi_service" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE CASCADE
);

-- 3. Material / retail sales (separate pipeline from visit sessions)
CREATE TABLE "material_sales" (
  "id" VARCHAR(50) NOT NULL,
  "company_id" VARCHAR(50) NOT NULL,
  "branch_id" VARCHAR(50) NOT NULL,
  "customer_id" VARCHAR(50) NULL,
  "customer_name" VARCHAR(150) NOT NULL DEFAULT 'Walk-in',
  "customer_phone" VARCHAR(30) NULL,
  "subtotal_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "discount_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "net_total_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "status" VARCHAR(20) NOT NULL DEFAULT 'open' CHECK ("status" IN ('open', 'completed', 'cancelled')),
  "is_paid" BOOLEAN NOT NULL DEFAULT FALSE,
  "paid_at" TIMESTAMP NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_ms_company" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_ms_branch" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_ms_customer" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL
);

CREATE TABLE "material_sale_items" (
  "id" VARCHAR(50) NOT NULL,
  "material_sale_id" VARCHAR(50) NOT NULL,
  "inventory_item_id" VARCHAR(50) NOT NULL,
  "item_name" VARCHAR(150) NOT NULL,
  "sku" VARCHAR(100) NULL,
  "unit" VARCHAR(20) NULL,
  "quantity" NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
  "unit_price_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "total_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_msi_sale" FOREIGN KEY ("material_sale_id") REFERENCES "material_sales" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_msi_item" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items" ("id") ON DELETE RESTRICT
);

-- 4. Group bookings ("special service" teams). Members stay individual queue tickets.
CREATE TABLE "group_visits" (
  "id" VARCHAR(50) NOT NULL,
  "company_id" VARCHAR(50) NOT NULL,
  "branch_id" VARCHAR(50) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "note" TEXT NULL,
  "subtotal_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "discount_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "tax_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "net_total_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "status" VARCHAR(20) NOT NULL DEFAULT 'open' CHECK ("status" IN ('open', 'completed', 'cancelled')),
  "is_paid" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_gv_company" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_gv_branch" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE
);

CREATE TABLE "group_visit_members" (
  "id" VARCHAR(50) NOT NULL,
  "group_id" VARCHAR(50) NOT NULL,
  "visit_session_id" VARCHAR(50) NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "uq_group_member" UNIQUE ("group_id", "visit_session_id"),
  CONSTRAINT "fk_gvm_group" FOREIGN KEY ("group_id") REFERENCES "group_visits" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_gvm_session" FOREIGN KEY ("visit_session_id") REFERENCES "visit_sessions" ("id") ON DELETE CASCADE
);

-- 5. Payments ledger (supports split payments, cashback, receipt attachments)
CREATE TABLE "payments" (
  "id" VARCHAR(50) NOT NULL,
  "company_id" VARCHAR(50) NOT NULL,
  "branch_id" VARCHAR(50) NOT NULL,
  "payable_type" VARCHAR(30) NOT NULL CHECK ("payable_type" IN ('visit', 'material_sale', 'group')),
  "payable_id" VARCHAR(50) NOT NULL,
  "visit_session_id" VARCHAR(50) NULL,
  "method" VARCHAR(20) NOT NULL CHECK ("method" IN ('cash', 'bank')),
  "bank_id" VARCHAR(50) NULL,
  "bank_name" VARCHAR(100) NULL,
  "txn_reference" VARCHAR(100) NULL,
  "amount_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "cashback_etb" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "receipt_path" VARCHAR(255) NULL,
  "created_by" VARCHAR(100) NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_pay_company" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_pay_branch" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_pay_bank" FOREIGN KEY ("bank_id") REFERENCES "banks" ("id") ON DELETE SET NULL,
  CONSTRAINT "fk_pay_visit" FOREIGN KEY ("visit_session_id") REFERENCES "visit_sessions" ("id") ON DELETE CASCADE
);

-- 6. Feedback & ratings (per visit)
CREATE TABLE "feedback" (
  "id" VARCHAR(50) NOT NULL,
  "company_id" VARCHAR(50) NOT NULL,
  "branch_id" VARCHAR(50) NOT NULL,
  "visit_session_id" VARCHAR(50) NULL,
  "customer_id" VARCHAR(50) NULL,
  "rating" INTEGER NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "complaint" TEXT NULL,
  "is_anonymous" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_fb_company" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_fb_branch" FOREIGN KEY ("branch_id") REFERENCES "branches" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_fb_session" FOREIGN KEY ("visit_session_id") REFERENCES "visit_sessions" ("id") ON DELETE SET NULL,
  CONSTRAINT "fk_fb_customer" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL
);

CREATE INDEX "idx_payments_payable" ON "payments" ("payable_type", "payable_id");
CREATE INDEX "idx_payments_created" ON "payments" ("company_id", "created_at");
CREATE INDEX "idx_material_sale_branch" ON "material_sales" ("branch_id", "created_at");
CREATE INDEX "idx_groups_branch" ON "group_visits" ("branch_id", "created_at");
CREATE INDEX "idx_feedback_session" ON "feedback" ("visit_session_id");