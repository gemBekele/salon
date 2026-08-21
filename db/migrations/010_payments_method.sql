-- 010 - Relax the legacy payment_method check on visit_sessions so bank payments
-- from the new payments ledger can be mirrored here for display/back-compat.
-- The source of truth for payment details is the `payments` table (migration 009).

ALTER TABLE "visit_sessions" DROP CONSTRAINT IF EXISTS "visit_sessions_payment_method_check";