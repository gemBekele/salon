-- 007 - Allow queue-management audit action types
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_action_type_check";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_action_type_check"
  CHECK ("action_type" IN ('inventory_adjustment', 'inventory_usage', 'commission_change', 'payment_edit', 'expense_added', 'price_change', 'security_event', 'queue_cancel', 'service_remove'));
