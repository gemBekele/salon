-- 012 - Performance indexes for the hot paths (queue start/complete, checkout,
-- payment summary, db-state light polls). FKs do not auto-index in Postgres.

CREATE INDEX IF NOT EXISTS "idx_vss_session" ON "visit_session_services" ("visit_session_id");
CREATE INDEX IF NOT EXISTS "idx_vss_staff_status" ON "visit_session_services" ("staff_id", "status");
CREATE INDEX IF NOT EXISTS "idx_payments_payable" ON "payments" ("payable_type", "payable_id");
CREATE INDEX IF NOT EXISTS "idx_payments_company_created" ON "payments" ("company_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_payments_branch_created" ON "payments" ("branch_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_customers_company_phone" ON "customers" ("company_id", "phone");
CREATE INDEX IF NOT EXISTS "idx_commission_logs_staff" ON "commission_logs" ("staff_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_commission_logs_session" ON "commission_logs" ("visit_session_id");
CREATE INDEX IF NOT EXISTS "idx_audit_company_ts" ON "audit_logs" ("company_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_sms_company_ts" ON "sms_logs" ("company_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_sessions_company_started" ON "visit_sessions" ("company_id", "started_at");
