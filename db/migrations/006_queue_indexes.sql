-- 006 - Queue management: service 'cancelled' status + queue lookup indexes
--
-- The salon now uses per-staff queues: a client is added to every assigned
-- staff's queue at check-in, ordered by (VIP first, then check-in time), but
-- is only "available" at one staff at a time (no sibling service in progress).

ALTER TABLE "visit_session_services" DROP CONSTRAINT IF EXISTS "visit_session_services_status_check";
ALTER TABLE "visit_session_services" ADD CONSTRAINT "visit_session_services_status_check"
  CHECK ("status" IN ('pending', 'in_progress', 'completed', 'cancelled'));

CREATE INDEX "idx_vss_staff_status" ON "visit_session_services" ("staff_id", "status");
CREATE INDEX "idx_vs_branch_created" ON "visit_sessions" ("branch_id", "created_at");
