-- 001 - Core ERP schema (16 tables)
-- Entity tables used across all personas. Column naming is snake_case;
-- the API layer maps these to camelCase frontend models.

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `subscription_plans` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `max_branches` INT NOT NULL DEFAULT 1,
  `max_business_units` INT NOT NULL DEFAULT 2,
  `max_staff` INT NOT NULL DEFAULT 10,
  `monthly_fee_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `features` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `companies` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `subscription_plan_id` VARCHAR(50) NOT NULL,
  `status` ENUM('active', 'suspended', 'trial') NOT NULL DEFAULT 'trial',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'ETB',
  `timezone` VARCHAR(100) NOT NULL DEFAULT 'Africa/Addis_Ababa',
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_companies_sub_plan` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `branches` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `address` TEXT NULL,
  `phone` VARCHAR(30) NULL,
  `is_main_branch` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_branches_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `business_units` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `type` ENUM('mens_salon', 'womens_salon', 'spa_center', 'massage_center') NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_bu_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bu_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `staff` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `business_unit_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(100) NULL,
  `role` ENUM('receptionist', 'barber', 'hairstylist', 'masseuse', 'esthetician', 'manager') NOT NULL,
  `specialties` JSON NULL,
  `default_commission_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 30.00,
  `status` ENUM('available', 'busy', 'off_shift') NOT NULL DEFAULT 'available',
  `avatar_url` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_staff_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_staff_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_staff_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `services` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `business_unit_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `price_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `duration_minutes` INT NOT NULL DEFAULT 30,
  `commission_type` ENUM('percentage', 'fixed_amount') NOT NULL DEFAULT 'percentage',
  `commission_value` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_services_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_services_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_items` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `business_unit_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `sku` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(20) NOT NULL,
  `current_stock` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `reorder_level` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `unit_cost_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `selling_price_etb` DECIMAL(12, 2) NULL,
  `last_restocked_at` DATE NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_inventory_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inventory_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inventory_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_inventory_requirements` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `service_id` VARCHAR(50) NOT NULL,
  `inventory_item_id` VARCHAR(50) NOT NULL,
  `quantity_used` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sir_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sir_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(100) NULL,
  `total_visits` INT NOT NULL DEFAULT 0,
  `total_spent_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `loyalty_points` INT NOT NULL DEFAULT 0,
  `is_vip` BOOLEAN NOT NULL DEFAULT FALSE,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_customers_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `visit_sessions` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `business_unit_id` VARCHAR(50) NOT NULL,
  `queue_number` VARCHAR(30) NOT NULL,
  `customer_id` VARCHAR(50) NOT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_phone` VARCHAR(30) NOT NULL,
  `status` ENUM('queued', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'queued',
  `subtotal_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `discount_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `tax_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `net_total_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('telebirr', 'cbe_birr', 'cash', 'card', 'mixed') NULL,
  `payment_reference` VARCHAR(100) NULL,
  `is_paid` BOOLEAN NOT NULL DEFAULT FALSE,
  `started_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_visit_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_visit_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_visit_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_visit_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `visit_session_services` (
  `id` VARCHAR(50) NOT NULL,
  `visit_session_id` VARCHAR(50) NOT NULL,
  `service_id` VARCHAR(50) NOT NULL,
  `service_name` VARCHAR(150) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `staff_name` VARCHAR(150) NOT NULL,
  `price_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `duration_minutes` INT NOT NULL DEFAULT 30,
  `commission_earned_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_vss_session` FOREIGN KEY (`visit_session_id`) REFERENCES `visit_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vss_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_vss_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `commission_rules` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `target_type` ENUM('staff', 'service') NOT NULL,
  `target_id` VARCHAR(50) NOT NULL,
  `target_name` VARCHAR(150) NOT NULL,
  `type` ENUM('percentage', 'fixed_amount') NOT NULL,
  `value` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `deduct_product_cost` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_com_rule_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `commission_logs` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `staff_name` VARCHAR(150) NOT NULL,
  `visit_session_id` VARCHAR(50) NOT NULL,
  `service_name` VARCHAR(150) NOT NULL,
  `service_price_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `commission_amount_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `rule_applied` VARCHAR(150) NOT NULL,
  `payout_status` ENUM('unpaid', 'payout_requested', 'paid') NOT NULL DEFAULT 'unpaid',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_cl_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cl_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cl_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cl_session` FOREIGN KEY (`visit_session_id`) REFERENCES `visit_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expenses` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `business_unit_id` VARCHAR(50) NULL,
  `category` ENUM('rent', 'utilities', 'inventory_purchase', 'salary', 'marketing', 'other') NOT NULL,
  `amount_etb` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `description` VARCHAR(255) NOT NULL,
  `payment_method` ENUM('telebirr', 'cbe_birr', 'cash', 'card', 'mixed') NOT NULL,
  `recorded_by` VARCHAR(100) NOT NULL,
  `date` DATE NOT NULL,
  `is_recurring` BOOLEAN NOT NULL DEFAULT FALSE,
  `recurrence_frequency` ENUM('weekly', 'monthly', 'quarterly') NULL,
  `next_due_date` DATE NULL,
  `auto_process_trigger` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_expenses_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_expenses_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_expenses_bu` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sms_logs` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `recipient_phone` VARCHAR(30) NOT NULL,
  `message_type` ENUM('appointment_reminder', 'queue_turn_alert', 'session_receipt', 'marketing_promo') NOT NULL,
  `content` TEXT NOT NULL,
  `status` ENUM('sent', 'queued', 'failed') NOT NULL DEFAULT 'queued',
  `sent_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sms_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NULL,
  `action_type` ENUM('inventory_adjustment', 'commission_change', 'payment_edit', 'expense_added', 'price_change', 'security_event') NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `performed_by` VARCHAR(100) NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `details` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_audit_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audit_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_sessions_branch_status` ON `visit_sessions` (`branch_id`, `status`);
CREATE INDEX `idx_sessions_company` ON `visit_sessions` (`company_id`);
CREATE INDEX `idx_commission_logs_staff` ON `commission_logs` (`staff_id`, `payout_status`);
CREATE INDEX `idx_expenses_date` ON `expenses` (`company_id`, `date`);
CREATE INDEX `idx_inventory_low_stock` ON `inventory_items` (`company_id`, `current_stock`, `reorder_level`);

SET FOREIGN_KEY_CHECKS = 1;
