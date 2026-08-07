import type { Pool } from 'mysql2/promise';
import { hashPassword } from './auth';

/**
 * Seeds reference data (subscription plans, companies, seed entity rows) plus
 * RBAC user accounts. Safe to run repeatedly — skips if companies already exist.
 */
export async function ensureSeeded(pool: Pool): Promise<void> {
  const [rows] = (await pool.query(`SELECT COUNT(*) AS c FROM companies`)) as any;
  if (Number(rows[0]?.c) > 0) {
    console.log('[seed] reference data already present, skipping.');
    return;
  }

  console.log('[seed] populating reference data...');
  await seedReferences(pool);
  await seedUsers(pool);
  console.log('[seed] done.');
}

async function run(pool: Pool, sql: string, values: any[]) {
  await pool.query(sql, values);
}

async function seedReferences(pool: Pool) {
  // 1. SubscriptionPlans
  await run(
    pool,
    `INSERT INTO subscription_plans (id, name, max_branches, max_business_units, max_staff, monthly_fee_etb, features) VALUES ?`,
    [
      [
        ['plan_starter', 'Single Location Starter', 1, 2, 10, 3500, '["1 Branch","Receptionist POS","Basic Reports","SMS Receipts"]'],
        ['plan_enterprise', 'Enterprise Multi-City Group', 15, 50, 200, 19500, '["Unlimited Branches across Cities","SaaS SLA & Audit Logs","AI Shift Optimizer","Custom Commission Rules"]'],
        ['plan_growth', 'Multi-Unit Growth', 3, 8, 35, 8500, '["Up to 3 Branches","Multi-Unit Scoping","Commission Engine","Auto-Deduction","Queue Display"]'],
      ],
    ]
  );

  // 2. Companies
  await run(pool, `INSERT INTO companies (id, name, slug, subscription_plan_id, status, currency, timezone, phone, email, created_at) VALUES ?`, [
    [
      ['cmp_glamour_01', 'Glamour & Serenity Spa Group', 'glamour-serenity', 'plan_enterprise', 'active', 'ETB', 'Africa/Addis_Ababa', '+251 91 144 8899', 'info@glamourserenity.et', '2025-01-15 00:00:00'],
      ['cmp_royal_barber_02', 'Royal Grooming Salon Ltd', 'royal-grooming', 'plan_enterprise', 'active', 'ETB', 'Africa/Addis_Ababa', '+251 91 233 4455', 'admin@royalgrooming.et', '2025-03-20 00:00:00'],
    ],
  ]);

  // 3. Branches
  await run(pool, `INSERT INTO branches (id, company_id, name, city, address, phone, is_main_branch, status) VALUES ?`, [
    [
      ['br_bole_01', 'cmp_glamour_01', 'Bole Medhanealem Flagship', 'Addis Ababa', 'Cameroon St, Next to Edna Mall', '+251 11 662 1020', 1, 'active'],
      ['br_kazanchis_02', 'cmp_glamour_01', 'Kazanchis Executive Center', 'Addis Ababa', 'UN Avenue, Near Elilly Hotel', '+251 11 551 8820', 0, 'active'],
      ['br_hawassa_03', 'cmp_glamour_01', 'Hawassa Lakeside Resort Spa', 'Hawassa', 'Lake Drive, Haile Resort Area', '+251 46 220 5050', 0, 'active'],
      ['br_royal_piassa_01', 'cmp_royal_barber_02', 'Piassa Heritage Barbershop', 'Addis Ababa', 'Piassa, Near St. George Church', '+251 11 111 2233', 1, 'active'],
      ['br_royal_bole_02', 'cmp_royal_barber_02', 'Bole Premium Grooming Lounge', 'Addis Ababa', 'Bole Road, Atlas Hotel Area', '+251 11 222 3344', 0, 'active'],
    ],
  ]);

  // 4. Business Units
  await run(pool, `INSERT INTO business_units (id, company_id, branch_id, type, name, code, status) VALUES ?`, [
    [
      ['bu_bole_mens', 'cmp_glamour_01', 'br_bole_01', 'mens_salon', 'Gentlemens Salon & Grooming', 'MS-BOL-01', 'active'],
      ['bu_bole_womens', 'cmp_glamour_01', 'br_bole_01', 'womens_salon', 'Ladies Beauty & Hair Lounge', 'WS-BOL-02', 'active'],
      ['bu_bole_spa', 'cmp_glamour_01', 'br_bole_01', 'spa_center', 'Royal Moroccan Hammam & Spa', 'SP-BOL-03', 'active'],
      ['bu_kazanchis_massage', 'cmp_glamour_01', 'br_kazanchis_02', 'massage_center', 'Executive Wellness & Reflexology', 'MC-KAZ-01', 'active'],
      ['bu_royal_piassa_mens', 'cmp_royal_barber_02', 'br_royal_piassa_01', 'mens_salon', 'Classic Mens Grooming Studio', 'MS-PIA-01', 'active'],
      ['bu_royal_piassa_barber', 'cmp_royal_barber_02', 'br_royal_piassa_01', 'barber_shop', 'Royal Beard & Shave Parlour', 'BR-PIA-02', 'active'],
      ['bu_royal_bole_lounge', 'cmp_royal_barber_02', 'br_royal_bole_02', 'mens_salon', 'Premium Mens Lounge & Styling', 'MS-BOL-R01', 'active'],
    ],
  ]);

  // 5. Staff
  await run(pool, `INSERT INTO staff (id, company_id, branch_id, business_unit_id, name, phone, email, role, specialties, default_commission_percentage, status) VALUES ?`, [
    [
      ['stf_abel_01', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Abel Tesfaye', '+251 91 188 2233', 'abel.t@glamourserenity.et', 'barber', '["Fade Cut","Hot Towel Shave","Beard Shaping"]', 30, 'available'],
      ['stf_bethlehem_02', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_spa', 'Bethlehem Girma', '+251 92 334 5566', 'beth.g@glamourserenity.et', 'masseuse', '["Deep Tissue Massage","Swedish","Aromatherapy"]', 35, 'busy'],
      ['stf_selam_03', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_womens', 'Selamawit Kebede', '+251 91 556 7788', 'selam.k@glamourserenity.et', 'hairstylist', '["Habesha Braids","Hair Coloring","Keratin Treatment"]', 28, 'available'],
      ['stf_marta_04', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_spa', 'Marta Haile', '+251 91 990 1122', 'marta.h@glamourserenity.et', 'esthetician', '["Moroccan Hammam Scrub","HydraFacial","Pedicure"]', 30, 'available'],
      ['stf_dawit_05', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Dawit Solomon', '+251 91 445 6677', 'dawit.s@glamourserenity.et', 'receptionist', '["POS Operations","Queue Dispatching","Customer Care"]', 0, 'available'],
      ['stf_royal_kaleb_01', 'cmp_royal_barber_02', 'br_royal_piassa_01', 'bu_royal_piassa_mens', 'Kaleb Alemayehu', '+251 91 333 1122', 'kaleb.r@royalgrooming.et', 'barber', '["Classic Fade","Pompadour","Hot Towel Shave"]', 30, 'available'],
      ['stf_royal_hana_02', 'cmp_royal_barber_02', 'br_royal_piassa_01', 'bu_royal_piassa_barber', 'Hana Tesfalem', '+251 92 444 2233', 'hana.r@royalgrooming.et', 'barber', '["Beard Sculpting","Razor Lineup","Facial Treatment"]', 28, 'available'],
      ['stf_royal_daniel_03', 'cmp_royal_barber_02', 'br_royal_bole_02', 'bu_royal_bole_lounge', 'Daniel Mekonnen', '+251 93 555 3344', 'daniel.r@royalgrooming.et', 'hairstylist', '["Modern Textured Crop","Undercut","Hair Design"]', 32, 'available'],
    ],
  ]);

  // 6. Services
  await run(pool, `INSERT INTO services (id, company_id, business_unit_id, name, category, price_etb, duration_minutes, commission_type, commission_value, is_active) VALUES ?`, [
    [
      ['srv_mens_cut_groom', 'cmp_glamour_01', 'bu_bole_mens', 'Executive Haircut & Beard Shaping', 'Hair & Grooming', 650, 45, 'percentage', 30, 1],
      ['srv_moroccan_hammam', 'cmp_glamour_01', 'bu_bole_spa', 'Royal Moroccan Hammam Scrub', 'Spa & Bath', 1800, 60, 'percentage', 30, 1],
      ['srv_deep_tissue_massage', 'cmp_glamour_01', 'bu_bole_spa', '60-Min Deep Tissue Massage', 'Massage Therapy', 2200, 60, 'percentage', 35, 1],
      ['srv_ladies_blowdry', 'cmp_glamour_01', 'bu_bole_womens', 'Signature Blowdry & Styling', 'Haircare', 950, 50, 'percentage', 28, 1],
      ['srv_pedicure_gel', 'cmp_glamour_01', 'bu_bole_womens', 'Deluxe Pedicure with Gel Polish', 'Nails', 850, 45, 'percentage', 30, 1],
      ['srv_royal_classic_cut', 'cmp_royal_barber_02', 'bu_royal_piassa_mens', 'Royal Classic Haircut', 'Hair & Grooming', 500, 30, 'percentage', 30, 1],
      ['srv_royal_hot_shave', 'cmp_royal_barber_02', 'bu_royal_piassa_barber', 'Premium Hot Towel Shave', 'Shaving', 400, 25, 'percentage', 25, 1],
      ['srv_royal_beard_sculpt', 'cmp_royal_barber_02', 'bu_royal_piassa_barber', 'Beard Sculpting & Conditioning', 'Grooming', 350, 20, 'percentage', 28, 1],
      ['srv_royal_modern_styling', 'cmp_royal_barber_02', 'bu_royal_bole_lounge', 'Modern Textured Styling', 'Hair & Grooming', 600, 40, 'percentage', 30, 1],
      ['srv_royal_facial', 'cmp_royal_barber_02', 'bu_royal_bole_lounge', 'Royal Facial Treatment', 'Skincare', 750, 35, 'percentage', 25, 1],
    ],
  ]);

  // 7. InventoryItems
  await run(pool, `INSERT INTO inventory_items (id, company_id, branch_id, business_unit_id, name, sku, unit, current_stock, reorder_level, unit_cost_etb, last_restocked_at) VALUES ?`, [
    [
      ['inv_massage_oil', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_spa', 'Organic Lavender Massage Oil', 'OIL-LAV-500', 'ml', 320, 300, 12, '2026-08-01'],
      ['inv_black_soap', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_spa', 'Moroccan Beldi Black Soap', 'SOP-BLK-250', 'pcs', 18, 10, 150, '2026-07-28'],
      ['inv_beard_balm', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Royal Sandalwood Beard Balm', 'BLM-SAN-100', 'pcs', 25, 5, 220, '2026-08-02'],
      ['inv_disposable_towels', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Premium Spa Towels (Disposable)', 'TWL-DSP-100', 'pcs', 140, 50, 25, '2026-08-04'],
      ['inv_royal_pomade', 'cmp_royal_barber_02', 'br_royal_piassa_01', 'bu_royal_piassa_mens', 'Royal Hold Pomade', 'POM-ROY-150', 'pcs', 40, 10, 180, '2026-08-03'],
      ['inv_royal_shaving_cream', 'cmp_royal_barber_02', 'br_royal_piassa_01', 'bu_royal_piassa_barber', 'Classic Shaving Cream', 'SHV-CLA-200', 'pcs', 30, 8, 95, '2026-08-01'],
      ['inv_royal_towels', 'cmp_royal_barber_02', 'br_royal_bole_02', 'bu_royal_bole_lounge', 'Premium Grooming Towels', 'TWL-PRM-100', 'pcs', 60, 20, 35, '2026-08-05'],
    ],
  ]);

  // 8. ServiceInventoryRequirements
  await run(pool, `INSERT INTO service_inventory_requirements (service_id, inventory_item_id, quantity_used) VALUES ?`, [
    [
      ['srv_mens_cut_groom', 'inv_beard_balm', 1],
      ['srv_mens_cut_groom', 'inv_disposable_towels', 1],
      ['srv_moroccan_hammam', 'inv_black_soap', 1],
      ['srv_moroccan_hammam', 'inv_disposable_towels', 2],
      ['srv_deep_tissue_massage', 'inv_massage_oil', 50],
      ['srv_royal_classic_cut', 'inv_royal_pomade', 1],
      ['srv_royal_hot_shave', 'inv_royal_shaving_cream', 1],
      ['srv_royal_hot_shave', 'inv_royal_towels', 1],
      ['srv_royal_modern_styling', 'inv_royal_pomade', 1],
      ['srv_royal_modern_styling', 'inv_royal_towels', 1],
    ],
  ]);

  // 9. Customers
  await run(pool, `INSERT INTO customers (id, company_id, name, phone, email, total_visits, total_spent_etb, loyalty_points, is_vip, notes, created_at) VALUES ?`, [
    [
      ['cust_yohannes_01', 'cmp_glamour_01', 'Yohannes Alemu', '+251 91 122 3344', 'yohannes.a@gmail.com', 12, 14200, 420, 1, 'Prefers hot towel finish', '2025-02-10 00:00:00'],
      ['cust_hiwot_02', 'cmp_glamour_01', 'Hiwot Tadesse', '+251 91 887 6655', 'hiwot.t@yahoo.com', 8, 18500, 580, 1, 'Sensitive skin', '2025-03-05 00:00:00'],
      ['cust_michael_03', 'cmp_glamour_01', 'Michael Worku', '+251 93 445 9900', null, 2, 2450, 70, 0, null, '2026-07-15 00:00:00'],
      ['cust_royal_samuel_01', 'cmp_royal_barber_02', 'Samuel Girma', '+251 91 555 6677', 'samuel.g@gmail.com', 6, 3200, 96, 0, 'Regular weekly client', '2025-06-10 00:00:00'],
      ['cust_royal_dawit_02', 'cmp_royal_barber_02', 'Dawit Getachew', '+251 92 666 7788', null, 3, 1800, 54, 0, null, '2026-01-20 00:00:00'],
    ],
  ]);

  // 10. VisitSessions
  await run(pool, `INSERT INTO visit_sessions (id, company_id, branch_id, business_unit_id, queue_number, customer_id, customer_name, customer_phone, status, subtotal_etb, discount_etb, tax_etb, net_total_etb, payment_method, payment_reference, is_paid, started_at, completed_at, notes) VALUES ?`, [
    [
      ['vst_101', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Q-101', 'cust_yohannes_01', 'Yohannes Alemu', '+251 91 122 3344', 'in_progress', 2850, 150, 0, 2700, 'telebirr', 'TB-998877', 0, '2026-08-06 10:15:00', null, 'Combo discount'],
      ['vst_102', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_spa', 'Q-102', 'cust_hiwot_02', 'Hiwot Tadesse', '+251 91 887 6655', 'completed', 1800, 0, 0, 1800, 'cbe_birr', 'CBE-771988', 1, '2026-08-06 09:30:00', '2026-08-06 10:35:00', null],
      ['vst_103', 'cmp_glamour_01', 'br_bole_01', 'bu_bole_mens', 'Q-103', 'cust_michael_03', 'Michael Worku', '+251 93 445 1120', 'queued', 650, 0, 0, 650, null, null, 0, '2026-08-06 11:00:00', null, null],
      ['vst_201', 'cmp_royal_barber_02', 'br_royal_piassa_01', 'bu_royal_piassa_mens', 'Q-201', 'cust_royal_samuel_01', 'Samuel Girma', '+251 91 555 6677', 'completed', 900, 0, 0, 900, 'cash', null, 1, '2026-08-06 09:00:00', '2026-08-06 09:35:00', null],
      ['vst_202', 'cmp_royal_barber_02', 'br_royal_piassa_01', 'bu_royal_piassa_barber', 'Q-202', 'cust_royal_dawit_02', 'Dawit Getachew', '+251 92 666 7788', 'in_progress', 750, 0, 0, 750, 'telebirr', 'TB-554433', 0, '2026-08-06 10:00:00', null, null],
    ],
  ]);

  // 11. VisitSessionServices
  await run(pool, `INSERT INTO visit_session_services (id, visit_session_id, service_id, service_name, staff_id, staff_name, price_etb, duration_minutes, commission_earned_etb, status) VALUES ?`, [
    [
      ['vss_101_1', 'vst_101', 'srv_mens_cut_groom', 'Executive Haircut & Beard Shaping', 'stf_abel_01', 'Abel Tesfaye', 650, 45, 195, 'completed'],
      ['vss_101_2', 'vst_101', 'srv_deep_tissue_massage', '60-Min Deep Tissue Massage', 'stf_bethlehem_02', 'Bethlehem Girma', 2200, 60, 770, 'in_progress'],
      ['vss_102_1', 'vst_102', 'srv_moroccan_hammam', 'Royal Moroccan Hammam Scrub', 'stf_marta_04', 'Marta Haile', 1800, 60, 540, 'completed'],
      ['vss_103_1', 'vst_103', 'srv_mens_cut_groom', 'Executive Haircut & Beard Shaping', 'stf_abel_01', 'Abel Tesfaye', 650, 45, 195, 'pending'],
      ['vss_201_1', 'vst_201', 'srv_royal_classic_cut', 'Royal Classic Haircut', 'stf_royal_kaleb_01', 'Kaleb Alemayehu', 500, 30, 150, 'completed'],
      ['vss_201_2', 'vst_201', 'srv_royal_hot_shave', 'Premium Hot Towel Shave', 'stf_royal_hana_02', 'Hana Tesfalem', 400, 25, 100, 'completed'],
      ['vss_202_1', 'vst_202', 'srv_royal_beard_sculpt', 'Beard Sculpting & Conditioning', 'stf_royal_hana_02', 'Hana Tesfalem', 350, 20, 98, 'in_progress'],
      ['vss_202_2', 'vst_202', 'srv_royal_modern_styling', 'Modern Textured Styling', 'stf_royal_daniel_03', 'Daniel Mekonnen', 600, 40, 180, 'pending'],
    ],
  ]);

  // 12. CommissionRules
  await run(pool, `INSERT INTO commission_rules (id, company_id, target_type, target_id, target_name, type, value, deduct_product_cost, is_active) VALUES ?`, [
    [
      ['rule_stf_01', 'cmp_glamour_01', 'staff', 'stf_abel_01', 'Abel Tesfaye (Barber)', 'percentage', 35, 0, 1],
      ['rule_stf_02', 'cmp_glamour_01', 'staff', 'stf_bethlehem_02', 'Bethlehem Girma (Spa)', 'percentage', 35, 0, 1],
      ['rule_srv_01', 'cmp_glamour_01', 'service', 'srv_deep_tissue_massage', '60-Min Deep Tissue Massage', 'fixed_amount', 800, 0, 1],
      ['rule_royal_kaleb', 'cmp_royal_barber_02', 'staff', 'stf_royal_kaleb_01', 'Kaleb Alemayehu (Barber)', 'percentage', 30, 0, 1],
      ['rule_royal_hana', 'cmp_royal_barber_02', 'staff', 'stf_royal_hana_02', 'Hana Tesfalem (Barber)', 'percentage', 28, 0, 1],
      ['rule_royal_daniel', 'cmp_royal_barber_02', 'staff', 'stf_royal_daniel_03', 'Daniel Mekonnen (Stylist)', 'percentage', 32, 0, 1],
    ],
  ]);

  // 13. CommissionLogs
  await run(pool, `INSERT INTO commission_logs (id, company_id, branch_id, staff_id, staff_name, visit_session_id, service_name, service_price_etb, commission_amount_etb, rule_applied, payout_status, created_at) VALUES ?`, [
    [
      ['com_01', 'cmp_glamour_01', 'br_bole_01', 'stf_abel_01', 'Abel Tesfaye', 'vst_101', 'Executive Haircut & Beard Shaping', 650, 195, '35% Staff Custom Rule', 'unpaid', '2026-08-06 10:15:00'],
      ['com_02', 'cmp_glamour_01', 'br_bole_01', 'stf_marta_04', 'Marta Haile', 'vst_102', 'Royal Moroccan Hammam Scrub', 1800, 540, '30% Esthetician Rate', 'paid', '2026-08-06 10:35:00'],
      ['com_03', 'cmp_royal_barber_02', 'br_royal_piassa_01', 'stf_royal_kaleb_01', 'Kaleb Alemayehu', 'vst_201', 'Royal Classic Haircut', 500, 150, '30% Staff Rule', 'paid', '2026-08-06 09:35:00'],
      ['com_04', 'cmp_royal_barber_02', 'br_royal_piassa_01', 'stf_royal_hana_02', 'Hana Tesfalem', 'vst_201', 'Premium Hot Towel Shave', 400, 100, '28% Staff Rule', 'paid', '2026-08-06 09:35:00'],
    ],
  ]);

  // 14. Expenses
  await run(pool, `INSERT INTO expenses (id, company_id, branch_id, business_unit_id, category, amount_etb, description, payment_method, recorded_by, date, is_recurring, recurrence_frequency, next_due_date, auto_process_trigger) VALUES ?`, [
    [
      ['exp_01', 'cmp_glamour_01', 'br_bole_01', null, 'inventory_purchase', 4500, 'Bulk purchase of Organic Lavender Oil (5L)', 'telebirr', 'Dawit Solomon', '2026-08-02', 0, null, null, 0],
      ['exp_02', 'cmp_glamour_01', 'br_bole_01', null, 'rent', 145000, 'Bole Flagship Commercial Space Monthly Rent', 'cbe_birr', 'Dawit Solomon', '2026-08-01', 1, 'monthly', '2026-09-01', 1],
      ['exp_03', 'cmp_glamour_01', 'br_bole_01', null, 'utilities', 12800, 'Electricity & Fiber Internet Bill', 'cbe_birr', 'Dawit Solomon', '2026-08-01', 1, 'monthly', '2026-09-01', 1],
    ],
  ]);

  // 15. SmsLogs
  await run(pool, `INSERT INTO sms_logs (id, company_id, recipient_phone, message_type, content, status, sent_at) VALUES ?`, [
    [
      ['base_sms_1', 'cmp_glamour_01', '+251 91 122 3344', 'session_receipt', 'Thank you Yohannes! Session Q-101 received. Total 2700 ETB.', 'sent', '2026-08-06 10:16:00'],
      ['base_sms_2', 'cmp_glamour_01', '+251 93 445 9900', 'queue_turn_alert', 'Hello Michael, ticket Q-103 is up next at Station 1.', 'sent', '2026-08-06 11:02:00'],
    ],
  ]);

  // 16. AuditLogs
  await run(pool, `INSERT INTO audit_logs (id, company_id, branch_id, action_type, description, performed_by, timestamp) VALUES ?`, [
    [
      ['base_aud_1', 'cmp_glamour_01', 'br_bole_01', 'inventory_adjustment', 'Manual Stock Adjustment: restocked +50 Massage Oil', 'Dawit Solomon (Tenant Admin)', '2026-08-06 09:30:00'],
      ['base_aud_2', 'cmp_glamour_01', 'br_bole_01', 'commission_change', 'Commission Rule Modified: Abel set to 35%', 'Dawit Solomon (Tenant Admin)', '2026-08-06 10:10:00'],
      ['base_aud_3', 'cmp_glamour_01', 'br_bole_01', 'payment_edit', 'Payment Checkout Finalized: Session Q-1021', 'Sara (Receptionist)', '2026-08-06 10:16:00'],
    ],
  ]);
}

async function seedUsers(pool: Pool) {
  // super admin can see the whole platform; others are tenant-scoped.
  await run(pool, `INSERT INTO users (id, company_id, name, email, password_hash, role) VALUES ?`, [
    [
      ['user_super', null, 'Platform Super Admin', 'admin@serenity.et', hashPassword('Admin123!'), 'super_admin'],
      ['user_glamour_mgr', 'cmp_glamour_01', 'Samson Barrow', 'admin@glamourserenity.et', hashPassword('Manager123!'), 'tenant_manager'],
      ['user_glamour_rec', 'cmp_glamour_01', 'Sara Reception', 'sara@glamourserenity.et', hashPassword('Staff123!'), 'receptionist'],
      ['user_glamour_staff', 'cmp_glamour_01', 'Abel Tesfaye (Staff)', 'abel@glamourserenity.et', hashPassword('Staff123!'), 'staff'],
    ],
  ]);
  console.log('[seed] created user accounts (admin@serenity.et / Admin123!).');
}