-- ==========================================================
-- Serenity Salon & Spa Management ERP SaaS Database Schema
-- Target Server: XAMPP Local MySQL (localhost:3306)
-- Database Name: gech_salon_db
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `gech_salon_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `gech_salon_db`;

-- Drop existing tables to enable clean seeding (in reverse order of dependencies)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `sms_logs`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `commission_logs`;
DROP TABLE IF EXISTS `commission_rules`;
DROP TABLE IF EXISTS `visit_session_services`;
DROP TABLE IF EXISTS `visit_sessions`;
DROP TABLE IF EXISTS `service_inventory_requirements`;
DROP TABLE IF EXISTS `inventory_items`;
DROP TABLE IF EXISTS `services`;
DROP TABLE IF EXISTS `staff`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `business_units`;
DROP TABLE IF EXISTS `branches`;
DROP TABLE IF EXISTS `companies`;
DROP TABLE IF EXISTS `subscription_plans`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Subscription Plans Table
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

-- 2. Companies Table (Tenants)
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

-- 3. Branches Table
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

-- 4. Business Units Table
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

-- 5. Staff Table
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

-- 6. Services Table
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

-- 7. Inventory Items Table
CREATE TABLE `inventory_items` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `branch_id` VARCHAR(50) NOT NULL,
  `business_unit_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `sku` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(20) NOT NULL, -- e.g., 'ml', 'pcs', 'bottle', 'box'
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

-- 8. Service Inventory Requirements Table (Consumables mapping)
CREATE TABLE `service_inventory_requirements` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `service_id` VARCHAR(50) NOT NULL,
  `inventory_item_id` VARCHAR(50) NOT NULL,
  `quantity_used` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sir_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sir_item` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Customers Table
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

-- 10. Visit Sessions Table (POS Queue Tickets)
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

-- 11. Visit Session Service Line Items Table
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

-- 12. Commission Rules Table
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

-- 13. Commission Logs Table (Settlement payroll ledger)
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

-- 14. Expenses Table
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

-- 15. SMS Logs Table
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

-- 16. Security Audit Logs Table
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

-- 17. Users Table (Auth & RBAC)
-- NOTE: Passwords are hashed by the seed tool (npm run db:seed). Super admin has NULL company_id.
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('super_admin', 'tenant_manager', 'receptionist', 'staff') NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `last_login_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  CONSTRAINT `fk_users_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_users_company` ON `users` (`company_id`);

-- ==========================================================
-- DATA SEEDING - SEED SAMPLE DATA FROM MOCK ERP DATA
-- NOTE: RBAC user accounts are created with hashed passwords via the seeded tool:
--       npm install && npm run db:migrate && npm run db:seed
-- ==========================================================

-- Seeding 1. Subscription Plans
INSERT INTO `subscription_plans` (`id`, `name`, `max_branches`, `max_business_units`, `max_staff`, `monthly_fee_etb`, `features`) VALUES
('plan_starter', 'Single Location Starter', 1, 2, 10, 3500.00, '["1 Branch", "Up to 2 Business Units", "Receptionist POS", "Basic Reports", "SMS Receipts"]'),
('plan_growth', 'Multi-Unit Growth', 3, 8, 35, 8500.00, '["Up to 3 Branches", "Multi-Unit Scoping", "Staff Commission Engine", "Inventory Auto-Deduction", "Queue Display"]'),
('plan_enterprise', 'Enterprise Multi-City Group', 15, 50, 200, 19500.00, '["Unlimited Branches across Cities", "SaaS SLA & Audit Logs", "AI Shift & Revenue Optimizer", "Custom Commission Rules", "API & Webhooks"]');

-- Seeding 2. Companies
INSERT INTO `companies` (`id`, `name`, `slug`, `subscription_plan_id`, `status`, `currency`, `timezone`, `phone`, `email`, `created_at`) VALUES
('cmp_glamour_01', 'Glamour & Serenity Spa Group', 'glamour-serenity', 'plan_enterprise', 'active', 'ETB', 'Africa/Addis_Ababa', '+251 91 144 8899', 'info@glamourserenity.et', '2025-01-15 00:00:00'),
('cmp_royal_barber_02', 'Royal Grooming & Salon Ltd', 'royal-grooming', 'plan_growth', 'active', 'ETB', 'Africa/Addis_Ababa', '+251 91 233 4455', 'admin@royalgrooming.et', '2025-03-20 00:00:00');

-- Seeding 3. Branches
INSERT INTO `branches` (`id`, `company_id`, `name`, `city`, `address`, `phone`, `is_main_branch`, `status`) VALUES
('br_bole_01', 'cmp_glamour_01', 'Bole Medhanealem Flagship', 'Addis Ababa', 'Cameroon St, Next to Edna Mall, Bole', '+251 11 662 1020', TRUE, 'active'),
('br_kazanchis_02', 'cmp_glamour_01', 'Kazanchis Executive Center', 'Addis Ababa', 'UN Avenue, Near Elilly Hotel', '+251 11 551 8820', FALSE, 'active'),
('br_hawassa_03', 'cmp_glamour_01', 'Hawassa Lakeside Resort Spa', 'Hawassa', 'Lake Drive, Haile Resort Area', '+251 46 220 5050', FALSE, 'active');

-- Seeding 4. Business Units
INSERT INTO `business_units` (`id`, `company_id`, `branch_id`, `type`, `name`, `code`, `status`) VALUES
('bu_bole_mens', 'cmp_glamour_01', 'br_bole_01', 'mens_salon', 'Gentlemens Salon & Grooming', 'MS-BOL-01', 'active'),
('bu_bole_womens', 'cmp_glamour_01', 'br_bole_01', 'womens_salon', 'Ladies Beauty & Hair Lounge', 'WS-BOL-02', 'active'),
('bu_bole_spa', 'cmp_glamour_01', 'br_bole_01', 'spa_center', 'Royal Moroccan Hammam & Spa', 'SP-BOL-03', 'active'),
('bu_kazanchis_massage', 'cmp_glamour_01', 'br_kazanchis_02', 'massage_center', 'Executive Wellness & Reflexology', 'MC-KAZ-01', 'active');

-- Seeding 5. Staff
INSERT INTO `staff` (`id`, `company_id`, `branch_id`, `business_unit_id`, `name`, `phone`, `email`, `role`, `specialties`, `default_commission_percentage`, `status`, `avatar_url`) VALUES
('stf_abel_01', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Abel Tesfaye', '+251 91 188 2233', 'abel.t@glamourserenity.et', 'barber', '["Fade Cut", "Hot Towel Shave", "Beard Shaping"]', 30.00, 'available', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'),
('stf_bethlehem_02', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_spa', 'Bethlehem Girma', '+251 92 334 5566', 'beth.g@glamourserenity.et', 'masseuse', '["Deep Tissue Massage", "Swedish Therapy", "Aromatherapy"]', 35.00, 'busy', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'),
('stf_selam_03', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_womens', 'Selamawit Kebede', '+251 91 556 7788', 'selam.k@glamourserenity.et', 'hairstylist', '["Habesha Braids", "Hair Coloring", "Keratin Treatment"]', 28.00, 'available', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200'),
('stf_marta_04', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_spa', 'Marta Haile', '+251 91 990 1122', 'marta.h@glamourserenity.et', 'esthetician', '["Moroccan Hammam Scrub", "HydraFacial", "Pedicure"]', 30.00, 'available', 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=200'),
('stf_dawit_05', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Dawit Solomon', '+251 91 445 6677', 'dawit.s@glamourserenity.et', 'receptionist', '["POS Operations", "Queue Dispatching", "Customer Care"]', 0.00, 'available', NULL);

-- Seeding 6. Services
INSERT INTO `services` (`id`, `company_id`, `business_unit_id`, `name`, `category`, `price_etb`, `duration_minutes`, `commission_type`, `commission_value`, `is_active`) VALUES
('srv_mens_cut_groom', 'cmp_glamour_01', 'bu_bole_mens', 'Executive Haircut & Beard Shaping', 'Hair & Grooming', 650.00, 45, 'percentage', 30.00, TRUE),
('srv_moroccan_hammam', 'cmp_glamour_01', 'bu_bole_spa', 'Royal Moroccan Hammam Scrub', 'Spa & Bath', 1800.00, 60, 'percentage', 30.00, TRUE),
('srv_deep_tissue_massage', 'cmp_glamour_01', 'bu_bole_spa', '60-Min Deep Tissue Therapeutic Massage', 'Massage Therapy', 2200.00, 60, 'percentage', 35.00, TRUE),
('srv_ladies_blowdry', 'cmp_glamour_01', 'bu_bole_womens', 'Signature Blowdry & Styling', 'Haircare', 950.00, 50, 'percentage', 28.00, TRUE),
('srv_pedicure_gel', 'cmp_glamour_01', 'bu_bole_womens', 'Deluxe Spa Pedicure with Gel Polish', 'Nails', 850.00, 45, 'percentage', 30.00, TRUE);

-- Seeding 7. Inventory Items
INSERT INTO `inventory_items` (`id`, `company_id`, `branch_id`, `business_unit_id`, `name`, `sku`, `unit`, `current_stock`, `reorder_level`, `unit_cost_etb`, `selling_price_etb`, `last_restocked_at`) VALUES
('inv_massage_oil', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_spa', 'Organic Lavender Massage Oil', 'OIL-LAV-500', 'ml', 320.00, 300.00, 12.00, NULL, '2026-08-01'),
('inv_black_soap', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_spa', 'Moroccan Beldi Black Soap', 'SOP-BLK-250', 'pcs', 18.00, 10.00, 150.00, NULL, '2026-07-28'),
('inv_beard_balm', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Royal Sandalwood Beard Balm', 'BLM-SAN-100', 'pcs', 25.00, 5.00, 220.00, NULL, '2026-08-02'),
('inv_disposable_towels', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Premium Spa Towels (Disposable)', 'TWL-DSP-100', 'pcs', 140.00, 50.00, 25.00, NULL, '2026-08-04');

-- Seeding 8. Service Inventory Requirements Mapping
INSERT INTO `service_inventory_requirements` (`service_id`, `inventory_item_id`, `quantity_used`) VALUES
('srv_mens_cut_groom', 'inv_beard_balm', 1.00),
('srv_mens_cut_groom', 'inv_disposable_towels', 1.00),
('srv_moroccan_hammam', 'inv_black_soap', 1.00),
('srv_moroccan_hammam', 'inv_disposable_towels', 2.00),
('srv_deep_tissue_massage', 'inv_massage_oil', 50.00);

-- Seeding 9. Customers
INSERT INTO `customers` (`id`, `company_id`, `name`, `phone`, `email`, `total_visits`, `total_spent_etb`, `loyalty_points`, `is_vip`, `notes`, `created_at`) VALUES
('cust_yohannes_01', 'cmp_glamour_01', 'Yohannes Alemu', '+251 91 122 3344', 'yohannes.a@gmail.com', 12, 14200.00, 420, TRUE, 'Prefers hot towel finish, likes Abel Tesfaye for haircuts.', '2025-02-10 00:00:00'),
('cust_hiwot_02', 'cmp_glamour_01', 'Hiwot Tadesse', '+251 91 887 6655', 'hiwot.t@yahoo.com', 8, 18500.00, 580, TRUE, 'Sensitive skin. Prefers Bethlehem for deep tissue massage.', '2025-03-05 00:00:00'),
('cust_michael_03', 'cmp_glamour_01', 'Michael Worku', '+251 93 445 9900', NULL, 2, 2450.00, 70, FALSE, NULL, '2026-07-15 00:00:00');

-- Seeding 10. Visit Sessions (POS Queue)
INSERT INTO `visit_sessions` (`id`, `company_id`, `branch_id`, `business_unit_id`, `queue_number`, `customer_id`, `customer_name`, `customer_phone`, `status`, `subtotal_etb`, `discount_etb`, `tax_etb`, `net_total_etb`, `payment_method`, `payment_reference`, `is_paid`, `started_at`, `completed_at`, `notes`) VALUES
('vst_101', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Q-101', 'cust_yohannes_01', 'Yohannes Alemu', '+251 91 122 3344', 'in_progress', 2850.00, 150.00, 0.00, 2700.00, 'telebirr', 'TB-99882211', FALSE, '2026-08-06 10:15:00', NULL, 'Combined Haircut + Spa Combo Discount Applied'),
('vst_102', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_spa', 'Q-102', 'cust_hiwot_02', 'Hiwot Tadesse', '+251 91 887 6655', 'completed', 1800.00, 0.00, 0.00, 1800.00, 'cbe_birr', 'CBE-771144', TRUE, '2026-08-06 09:30:00', '2026-08-06 10:35:00', NULL),
('vst_103', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Q-103', 'cust_michael_03', 'Michael Worku', '+251 93 445 9900', 'queued', 650.00, 0.00, 0.00, 650.00, NULL, NULL, FALSE, '2026-08-06 11:00:00', NULL, NULL);

-- Seeding 11. Visit Session Service Line Items
INSERT INTO `visit_session_services` (`id`, `visit_session_id`, `service_id`, `service_name`, `staff_id`, `staff_name`, `price_etb`, `duration_minutes`, `commission_earned_etb`, `status`) VALUES
('vss_101_1', 'vst_101', 'srv_mens_cut_groom', 'Executive Haircut & Beard Shaping', 'stf_abel_01', 'Abel Tesfaye', 650.00, 45, 195.00, 'completed'),
('vss_101_2', 'vst_101', 'srv_deep_tissue_massage', '60-Min Deep Tissue Therapeutic Massage', 'stf_bethlehem_02', 'Bethlehem Girma', 2200.00, 60, 770.00, 'in_progress'),
('vss_102_1', 'vst_102', 'srv_moroccan_hammam', 'Royal Moroccan Hammam Scrub', 'stf_marta_04', 'Marta Haile', 1800.00, 60, 540.00, 'completed'),
('vss_103_1', 'vst_103', 'srv_mens_cut_groom', 'Executive Haircut & Beard Shaping', 'stf_abel_01', 'Abel Tesfaye', 650.00, 45, 195.00, 'pending');

-- Seeding 12. Commission Rules
INSERT INTO `commission_rules` (`id`, `company_id`, `target_type`, `target_id`, `target_name`, `type`, `value`, `deduct_product_cost`, `is_active`, `updated_at`) VALUES
('rule_stf_01', 'cmp_glamour_01', 'staff', 'stf_abel_01', 'Abel Tesfaye (Barber)', 'percentage', 35.00, FALSE, TRUE, '2026-02-01 00:00:00'),
('rule_stf_02', 'cmp_glamour_01', 'staff', 'stf_bethlehem_02', 'Bethlehem Girma (Spa)', 'percentage', 35.00, FALSE, TRUE, '2026-02-05 00:00:00'),
('rule_srv_01', 'cmp_glamour_01', 'service', 'srv_deep_tissue_massage', '60-Min Deep Tissue Therapeutic Massage', 'fixed_amount', 800.00, FALSE, TRUE, '2026-02-10 00:00:00');

-- Seeding 13. Commission Logs
INSERT INTO `commission_logs` (`id`, `company_id`, `branch_id`, `staff_id`, `staff_name`, `visit_session_id`, `service_name`, `service_price_etb`, `commission_amount_etb`, `rule_applied`, `payout_status`, `created_at`) VALUES
('com_01', 'cmp_glamour_01', 'br_bole_01', 'stf_abel_01', 'Abel Tesfaye', 'vst_101', 'Executive Haircut & Beard Shaping', 650.00, 195.00, '30% Barber Standard Rate', 'unpaid', '2026-08-06 10:15:00'),
('com_02', 'cmp_glamour_01', 'br_bole_01', 'stf_marta_04', 'Marta Haile', 'vst_102', 'Royal Moroccan Hammam Scrub', 1800.00, 540.00, '30% Esthetician Rate', 'paid', '2026-08-06 10:35:00'),
('com_03', 'cmp_glamour_01', 'br_bole_01', 'stf_bethlehem_02', 'Bethlehem Girma', 'vst_101', '60-Min Deep Tissue Therapeutic Massage', 2200.00, 770.00, '35% Senior Masseuse Rate', 'payout_requested', '2026-08-06 10:15:00');

-- Seeding 14. Expenses
INSERT INTO `expenses` (`id`, `company_id`, `branch_id`, `business_unit_id`, `category`, `amount_etb`, `description`, `payment_method`, `recorded_by`, `date`, `is_recurring`, `recurrence_frequency`, `next_due_date`, `auto_process_trigger`) VALUES
('exp_01', 'cmp_glamour_01', 'br_bole_01', NULL, 'inventory_purchase', 4500.00, 'Bulk purchase of Organic Lavender Massage Oil (5L)', 'telebirr', 'Dawit Solomon', '2026-08-02', FALSE, NULL, NULL, FALSE),
('exp_02', 'cmp_glamour_01', 'br_bole_01', NULL, 'rent', 145000.00, 'Bole Medhanealem Flagship Commercial Space Monthly Rent', 'cbe_birr', 'Dawit Solomon', '2026-08-01', TRUE, 'monthly', '2026-09-01', TRUE),
('exp_03', 'cmp_glamour_01', 'br_bole_01', NULL, 'utilities', 12800.00, 'Bole Flagship Electricity & High-speed Fiber Internet Bill', 'cbe_birr', 'Dawit Solomon', '2026-08-01', TRUE, 'monthly', '2026-09-01', TRUE);

-- Seeding 15. SMS Logs
INSERT INTO `sms_logs` (`id`, `company_id`, `recipient_phone`, `message_type`, `content`, `status`, `sent_at`) VALUES
('sms_01', 'cmp_glamour_01', '+251 91 122 3344', 'session_receipt', 'Glamour Spa Bole: Thank you Yohannes! Session Q-101 registered. Total: 2700 ETB. Telebirr ref: TB-99882211.', 'sent', '2026-08-06 10:16:00'),
('sms_02', 'cmp_glamour_01', '+251 93 445 9900', 'queue_turn_alert', 'Glamour Salon: Hello Michael, ticket Q-103 is up next at Station 1 (Barber Abel). Please step inside.', 'sent', '2026-08-06 11:02:00');

-- Seeding 16. Security Audit Logs
INSERT INTO `audit_logs` (`id`, `company_id`, `branch_id`, `action_type`, `description`, `performed_by`, `timestamp`, `details`, `ip_address`) VALUES
('aud_101', 'cmp_glamour_01', 'br_bole_01', 'inventory_adjustment', 'Manual Stock Adjustment: Restocked +50 Organic Lavender Massage Oil (5L)', 'Dawit Solomon (Tenant Admin)', '2026-08-06 09:30:00', 'Initial stock reorder threshold override', '197.156.102.14'),
('aud_102', 'cmp_glamour_01', 'br_bole_01', 'commission_change', 'Commission Rule Modified: Set Abel Tesfaye (Barber) to 35%', 'Dawit Solomon (Tenant Admin)', '2026-08-06 10:10:00', 'Increased senior barber commission rate by 5%', '197.156.102.14'),
('aud_103', 'cmp_glamour_01', 'br_bole_01', 'payment_edit', 'Payment Checkout Finalized: Session Q-101 (2700 ETB via Telebirr)', 'Sara Tekle (Receptionist)', '2026-08-06 10:16:00', 'Reference TB-99882211 verified', '197.156.102.88'),
('aud_104', 'cmp_glamour_01', 'br_bole_01', 'expense_added', 'Recurring Expense Triggered: Rent (145,000 ETB) queued for Bole Flagship', 'System Auto-Trigger', '2026-08-01 08:00:00', 'Monthly recurring schedule executed', '127.0.0.1');

-- ==========================================================
-- END OF DATABASE SCRIPT
-- ==========================================================
