-- 003 - Add UNIQUE constraint for commission_rules to prevent duplicates
-- This ensures one rule per staff/service per company.

-- First, remove any existing duplicates (keep the latest)
DELETE cr1 FROM commission_rules cr1
INNER JOIN commission_rules cr2
WHERE cr1.company_id = cr2.company_id
  AND cr1.target_type = cr2.target_type
  AND cr1.target_id = cr2.target_id
  AND cr1.id < cr2.id;

-- Add the UNIQUE constraint
ALTER TABLE `commission_rules`
  ADD UNIQUE INDEX `uq_commission_rules_target` (`company_id`, `target_type`, `target_id`);
