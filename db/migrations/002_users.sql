-- 002 - Role-Based Access Control: user accounts
-- Super admin users have a NULL company_id and can scope across all tenants.
-- Company staff/manager/receptionist users are bound to a single company_id.

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