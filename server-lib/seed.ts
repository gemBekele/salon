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
        ['plan_growth', 'Multi-Unit Growth', 3, 8, 35, 8500, '["Up to 3 Branches","Multi-Unit Scoping","Commission Engine","Auto-Deduction","Queue Display"]'],
        ['plan_enterprise', 'Enterprise Multi-City Group', 15, 50, 200, 19500, '["Unlimited Branches across Cities","SaaS SLA & Audit Logs","AI Shift Optimizer","Custom Commission Rules"]'],
      ],
    ]
  );

  // 2. Companies — Gech Beauty Salon
  await run(pool, `INSERT INTO companies (id, name, slug, subscription_plan_id, status, currency, timezone, phone, email, created_at) VALUES ?`, [
    [
      ['cmp_gech_01', 'Gech Beauty Salon', 'gech-beauty-salon', 'plan_growth', 'active', 'ETB', 'Africa/Addis_Ababa', '+251 91 456 7890', 'info@gechsalon.et', '2024-06-01 00:00:00'],
    ],
  ]);

  // 3. Branches — Female Salon & Men's Grooming in Hawassa
  await run(pool, `INSERT INTO branches (id, company_id, name, city, address, phone, is_main_branch, status) VALUES ?`, [
    [
      ['br_female_01', 'cmp_gech_01', 'Gech Female Beauty Salon', 'Hawassa', 'Megersa Condo, 2nd Floor, Hawassa', '+251 91 456 7890', 1, 'active'],
      ['br_mens_01', 'cmp_gech_01', "Gech Men's Grooming Lounge", 'Hawassa', 'Piassa Area, Near Hawassa University Gate', '+251 91 456 7891', 0, 'active'],
    ],
  ]);

  // 4. Business Units
  await run(pool, `INSERT INTO business_units (id, company_id, branch_id, type, name, code, status) VALUES ?`, [
    [
      ['bu_female_hair', 'cmp_gech_01', 'br_female_01', 'womens_salon', 'Hair Styling & Braids', 'FS-HAIR-01', 'active'],
      ['bu_female_nails', 'cmp_gech_01', 'br_female_01', 'nail_salon', 'Nail Art & Manicure/Pedicure', 'FS-NAIL-02', 'active'],
      ['bu_female_skin', 'cmp_gech_01', 'br_female_01', 'spa_center', 'Skincare & Facials', 'FS-SKIN-03', 'active'],
      ['bu_mens_hair', 'cmp_gech_01', 'br_mens_01', 'barber_shop', 'Haircut & Styling', 'MG-HAIR-01', 'active'],
      ['bu_mens_grooming', 'cmp_gech_01', 'br_mens_01', 'mens_salon', 'Beard & Shave', 'MG-BEARD-02', 'active'],
      ['bu_mens_facial', 'cmp_gech_01', 'br_mens_01', 'spa_center', 'Facial & Skincare', 'MG-FACE-03', 'active'],
    ],
  ]);

  // 5. Staff
  await run(pool, `INSERT INTO staff (id, company_id, branch_id, business_unit_id, name, phone, email, role, specialties, default_commission_percentage, status) VALUES ?`, [
    [
      // Female Salon Staff
      ['stf_hana_01', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Hana Abera', '+251 91 111 2233', 'hana@gechsalon.et', 'hairstylist', '["Hair Coloring","Blowdry","Keratin Treatment"]', 28, 'available'],
      ['stf_meron_02', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Meron Tadesse', '+251 91 222 3344', 'meron@gechsalon.et', 'hairstylist', '["Habesha Braids","Cornrows","Twist Outs"]', 30, 'available'],
      ['stf_alma_03', 'cmp_gech_01', 'br_female_01', 'bu_female_nails', 'Alma Getahun', '+251 91 333 4455', 'alma@gechsalon.et', 'nail Technician', '["Gel Nails","French Manicure","Nail Art"]', 25, 'available'],
      ['stf_fikir_04', 'cmp_gech_01', 'br_female_01', 'bu_female_skin', 'Fikir Worku', '+251 92 444 5566', 'fikir@gechsalon.et', 'esthetician', '["HydraFacial","Chemical Peel","Acne Treatment"]', 30, 'available'],
      ['stf_reception_05', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Liya Gebremedhin', '+251 93 555 6677', 'liya@gechsalon.et', 'receptionist', '["POS Operations","Customer Care","Appointments"]', 0, 'available'],
      // Men's Grooming Staff
      ['stf_bereket_06', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Bereket Shimelis', '+251 91 666 7788', 'bereket@gechsalon.et', 'barber', '["Fade Cut","Classic Taper","Flat Top"]', 30, 'available'],
      ['stf_yonatan_07', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'Yonatan Alemayehu', '+251 91 777 8899', 'yonatan@gechsalon.et', 'barber', '["Beard Sculpting","Hot Towel Shave","Razor Lineup"]', 28, 'available'],
      ['stf_nathan_08', 'cmp_gech_01', 'br_mens_01', 'bu_mens_facial', 'Nathan Tesfaye', '+251 92 888 9900', 'nathan@gechsalon.et', 'esthetician', '["Men Facial","Deep Cleanse","Anti-Acne"]', 25, 'available'],
      ['stf_mens_rec_09', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Samuel Desta', '+251 93 999 0011', 'samuel@gechsalon.et', 'receptionist', '["POS Operations","Queue Management","SMS Receipts"]', 0, 'available'],
    ],
  ]);

  // 6. Services — Female Salon (Hair, Nails, Skin)
  await run(pool, `INSERT INTO services (id, company_id, business_unit_id, name, category, price_etb, duration_minutes, commission_type, commission_value, is_active) VALUES ?`, [
    [
      // Female Hair
      ['srv_f_blowdry', 'cmp_gech_01', 'bu_female_hair', 'Blowdry & Styling', 'Hair Styling', 600, 45, 'percentage', 28, 1],
      ['srv_f_color', 'cmp_gech_01', 'bu_female_hair', 'Hair Coloring & Highlights', 'Hair Coloring', 2500, 120, 'percentage', 30, 1],
      ['srv_f_keratin', 'cmp_gech_01', 'bu_female_hair', 'Keratin Treatment', 'Hair Treatment', 4500, 150, 'percentage', 30, 1],
      ['srv_f_braids', 'cmp_gech_01', 'bu_female_hair', 'Habesha Braids', 'Braiding', 1800, 180, 'percentage', 30, 1],
      ['srv_f_cornrows', 'cmp_gech_01', 'bu_female_hair', 'Cornrows Style', 'Braiding', 1200, 90, 'percentage', 28, 1],
      ['srv_f_extension', 'cmp_gech_01', 'bu_female_hair', 'Hair Extension Install', 'Hair Extension', 3500, 120, 'percentage', 25, 1],
      // Female Nails
      ['srv_f_manicure', 'cmp_gech_01', 'bu_female_nails', 'Gel Manicure', 'Nail Care', 500, 45, 'percentage', 25, 1],
      ['srv_f_pedicure', 'cmp_gech_01', 'bu_female_nails', 'Deluxe Pedicure', 'Nail Care', 650, 50, 'percentage', 25, 1],
      ['srv_f_nailart', 'cmp_gech_01', 'bu_female_nails', 'Nail Art Design', 'Nail Art', 300, 30, 'percentage', 20, 1],
      ['srv_f_gel_full', 'cmp_gech_01', 'bu_female_nails', 'Full Set Gel Nails', 'Nail Care', 800, 60, 'percentage', 28, 1],
      // Female Skin
      ['srv_f_facial', 'cmp_gech_01', 'bu_female_skin', 'HydraFacial Treatment', 'Facial', 2000, 60, 'percentage', 30, 1],
      ['srv_f_acne', 'cmp_gech_01', 'bu_female_skin', 'Acne Treatment Session', 'Skincare', 1500, 45, 'percentage', 28, 1],
      ['srv_f_peel', 'cmp_gech_01', 'bu_female_skin', 'Chemical Peel', 'Skincare', 2200, 40, 'percentage', 30, 1],
      // Men's Hair
      ['srv_m_haircut', 'cmp_gech_01', 'bu_mens_hair', 'Classic Haircut', 'Haircut', 400, 30, 'percentage', 30, 1],
      ['srv_m_fade', 'cmp_gech_01', 'bu_mens_hair', 'Fade Haircut & Design', 'Haircut', 500, 35, 'percentage', 30, 1],
      ['srv_m_kids', 'cmp_gech_01', 'bu_mens_hair', "Kids Haircut (Under 12)", 'Haircut', 250, 20, 'percentage', 25, 1],
      // Men's Beard & Shave
      ['srv_m_beard', 'cmp_gech_01', 'bu_mens_grooming', 'Beard Trim & Sculpt', 'Grooming', 300, 20, 'percentage', 28, 1],
      ['srv_m_shave', 'cmp_gech_01', 'bu_mens_grooming', 'Premium Hot Towel Shave', 'Shaving', 400, 25, 'percentage', 28, 1],
      ['srv_m_combo', 'cmp_gech_01', 'bu_mens_grooming', 'Haircut + Beard Combo', 'Combo', 650, 45, 'percentage', 30, 1],
      // Men's Facial
      ['srv_m_facial', 'cmp_gech_01', 'bu_mens_facial', 'Deep Cleanse Facial', 'Facial', 800, 35, 'percentage', 25, 1],
      ['srv_m_acne', 'cmp_gech_01', 'bu_mens_facial', 'Anti-Acne Treatment', 'Skincare', 1000, 40, 'percentage', 28, 1],
    ],
  ]);

  // 7. InventoryItems
  await run(pool, `INSERT INTO inventory_items (id, company_id, branch_id, business_unit_id, name, sku, unit, current_stock, reorder_level, unit_cost_etb, last_restocked_at) VALUES ?`, [
    [
      // Female Salon
      ['inv_hair_color', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Professional Hair Color Kit', 'COL-PRF-500', 'pcs', 20, 5, 850, '2026-08-01'],
      ['inv_keratin', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Keratin Treatment Serum', 'KRT-SRM-200', 'btl', 12, 3, 1200, '2026-08-03'],
      ['inv_hair_ext', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Brazilian Hair Extension Bundle', 'EXT-BRA-100', 'pcs', 8, 2, 2500, '2026-07-28'],
      ['inv_gel_polish', 'cmp_gech_01', 'br_female_01', 'bu_female_nails', 'Gel Nail Polish Collection', 'NLP-GEL-30', 'set', 6, 2, 450, '2026-08-05'],
      ['inv_nail_remover', 'cmp_gech_01', 'br_female_01', 'bu_female_nails', 'Acetone-Free Remover', 'NLR-ACT-500', 'ml', 800, 200, 8, '2026-08-02'],
      ['inv_facial_kit', 'cmp_gech_01', 'br_female_01', 'bu_female_skin', 'HydraFacial Treatment Kit', 'FCL-HYD-10', 'pcs', 15, 5, 350, '2026-08-04'],
      // Men's Grooming
      ['inv_pomade', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Premium Hold Pomade', 'POM-PRM-150', 'pcs', 30, 10, 180, '2026-08-03'],
      ['inv_shaving_cream', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'Classic Shaving Cream', 'SHV-CLS-200', 'pcs', 25, 8, 95, '2026-08-01'],
      ['inv_hot_towel', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'Hot Towel Wraps (Disposable)', 'TWL-HT-100', 'pcs', 100, 30, 15, '2026-08-05'],
      ['inv_aftershave', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'Aftershave Balm', 'SHV-AFT-150', 'pcs', 18, 5, 120, '2026-08-02'],
      ['inv_mens_facial_kit', 'cmp_gech_01', 'br_mens_01', 'bu_mens_facial', 'Men Deep Cleanse Facial Kit', 'FCL-MEN-10', 'pcs', 10, 3, 280, '2026-08-04'],
    ],
  ]);

  // 8. ServiceInventoryRequirements
  await run(pool, `INSERT INTO service_inventory_requirements (service_id, inventory_item_id, quantity_used) VALUES ?`, [
    [
      ['srv_f_color', 'inv_hair_color', 1],
      ['srv_f_keratin', 'inv_keratin', 1],
      ['srv_f_extension', 'inv_hair_ext', 1],
      ['srv_f_manicure', 'inv_gel_polish', 1],
      ['srv_f_gel_full', 'inv_gel_polish', 2],
      ['srv_f_facial', 'inv_facial_kit', 1],
      ['srv_m_haircut', 'inv_pomade', 1],
      ['srv_m_fade', 'inv_pomade', 1],
      ['srv_m_shave', 'inv_shaving_cream', 1],
      ['srv_m_shave', 'inv_hot_towel', 2],
      ['srv_m_shave', 'inv_aftershave', 1],
      ['srv_m_beard', 'inv_pomade', 1],
      ['srv_m_combo', 'inv_pomade', 1],
      ['srv_m_facial', 'inv_mens_facial_kit', 1],
    ],
  ]);

  // 9. Customers
  await run(pool, `INSERT INTO customers (id, company_id, name, phone, email, total_visits, total_spent_etb, loyalty_points, is_vip, notes, created_at) VALUES ?`, [
    [
      ['cust_seble_01', 'cmp_gech_01', 'Seble Mulugeta', '+251 91 100 2001', 'seble.m@gmail.com', 15, 22500, 675, 1, 'Regular VIP, prefers Hana for coloring', '2024-08-15 00:00:00'],
      ['cust_haile_02', 'cmp_gech_01', 'Haile Gebreselassie', '+251 91 200 3002', null, 8, 5200, 156, 0, 'Weekly haircut client', '2025-01-10 00:00:00'],
      ['cust_fasika_03', 'cmp_gech_01', 'Fasika Demissie', '+251 92 300 4003', 'fasika.d@yahoo.com', 6, 11000, 330, 0, null, '2025-03-20 00:00:00'],
      ['cust_tesfaye_04', 'cmp_gech_01', 'Tesfaye Alemu', '+251 93 400 5004', null, 12, 7800, 234, 1, 'Loyal men\'s grooming client', '2024-11-05 00:00:00'],
      ['cust_miheret_05', 'cmp_gech_01', 'Miheret Kassahun', '+251 91 500 6005', 'miheret.k@gmail.com', 4, 8200, 246, 0, 'First-time facial, sensitive skin', '2026-06-01 00:00:00'],
    ],
  ]);

  // 10. VisitSessions — recent sample data
  await run(pool, `INSERT INTO visit_sessions (id, company_id, branch_id, business_unit_id, queue_number, customer_id, customer_name, customer_phone, status, subtotal_etb, discount_etb, tax_etb, net_total_etb, payment_method, payment_reference, is_paid, started_at, completed_at, notes) VALUES ?`, [
    [
      ['vst_g01', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Q-001', 'cust_seble_01', 'Seble Mulugeta', '+251 91 100 2001', 'completed', 3100, 100, 0, 3000, 'telebirr', 'TB-445566', 1, '2026-08-07 09:00:00', '2026-08-07 10:30:00', 'Color + Blowdry combo'],
      ['vst_g02', 'cmp_gech_01', 'br_female_01', 'bu_female_nails', 'Q-002', 'cust_fasika_03', 'Fasika Demissie', '+251 92 300 4003', 'completed', 1300, 0, 0, 1300, 'cbe_birr', 'CBE-778899', 1, '2026-08-07 10:00:00', '2026-08-07 10:55:00', null],
      ['vst_g03', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Q-003', 'cust_haile_02', 'Haile Gebreselassie', '+251 91 200 3002', 'in_progress', 500, 0, 0, 500, 'cash', null, 0, '2026-08-07 11:00:00', null, 'Fade haircut'],
      ['vst_g04', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'Q-004', 'cust_tesfaye_04', 'Tesfaye Alemu', '+251 93 400 5004', 'queued', 650, 0, 0, 650, null, null, 0, '2026-08-07 11:30:00', null, 'Haircut + Beard combo'],
    ],
  ]);

  // 11. VisitSessionServices
  await run(pool, `INSERT INTO visit_session_services (id, visit_session_id, service_id, service_name, staff_id, staff_name, price_etb, duration_minutes, commission_earned_etb, status) VALUES ?`, [
    [
      ['vss_g01_1', 'vst_g01', 'srv_f_color', 'Hair Coloring & Highlights', 'stf_hana_01', 'Hana Abera', 2500, 120, 750, 'completed'],
      ['vss_g01_2', 'vst_g01', 'srv_f_blowdry', 'Blowdry & Styling', 'stf_hana_01', 'Hana Abera', 600, 45, 168, 'completed'],
      ['vss_g02_1', 'vst_g02', 'srv_f_manicure', 'Gel Manicure', 'stf_alma_03', 'Alma Getahun', 500, 45, 125, 'completed'],
      ['vss_g02_2', 'vst_g02', 'srv_f_pedicure', 'Deluxe Pedicure', 'stf_alma_03', 'Alma Getahun', 650, 50, 163, 'completed'],
      ['vss_g03_1', 'vst_g03', 'srv_m_fade', 'Fade Haircut & Design', 'stf_bereket_06', 'Bereket Shimelis', 500, 35, 150, 'in_progress'],
      ['vss_g04_1', 'vst_g04', 'srv_m_combo', 'Haircut + Beard Combo', 'stf_bereket_06', 'Bereket Shimelis', 650, 45, 195, 'pending'],
    ],
  ]);

  // 12. CommissionRules
  await run(pool, `INSERT INTO commission_rules (id, company_id, target_type, target_id, target_name, type, value, deduct_product_cost, is_active) VALUES ?`, [
    [
      ['rule_hana', 'cmp_gech_01', 'staff', 'stf_hana_01', 'Hana Abera (Hairstylist)', 'percentage', 28, 0, 1],
      ['rule_meron', 'cmp_gech_01', 'staff', 'stf_meron_02', 'Meron Tadesse (Hairstylist)', 'percentage', 30, 0, 1],
      ['rule_alma', 'cmp_gech_01', 'staff', 'stf_alma_03', 'Alma Getahun (Nail Tech)', 'percentage', 25, 0, 1],
      ['rule_fikir', 'cmp_gech_01', 'staff', 'stf_fikir_04', 'Fikir Worku (Esthetician)', 'percentage', 30, 0, 1],
      ['rule_bereket', 'cmp_gech_01', 'staff', 'stf_bereket_06', 'Bereket Shimelis (Barber)', 'percentage', 30, 0, 1],
      ['rule_yonatan', 'cmp_gech_01', 'staff', 'stf_yonatan_07', 'Yonatan Alemayehu (Barber)', 'percentage', 28, 0, 1],
      ['rule_nathan', 'cmp_gech_01', 'staff', 'stf_nathan_08', 'Nathan Tesfaye (Esthetician)', 'percentage', 25, 0, 1],
    ],
  ]);

  // 13. CommissionLogs
  await run(pool, `INSERT INTO commission_logs (id, company_id, branch_id, staff_id, staff_name, visit_session_id, service_name, service_price_etb, commission_amount_etb, rule_applied, payout_status, created_at) VALUES ?`, [
    [
      ['com_g01', 'cmp_gech_01', 'br_female_01', 'stf_hana_01', 'Hana Abera', 'vst_g01', 'Hair Coloring & Highlights', 2500, 750, '28% Hairstylist Rule', 'unpaid', '2026-08-07 10:30:00'],
      ['com_g02', 'cmp_gech_01', 'br_female_01', 'stf_hana_01', 'Hana Abera', 'vst_g01', 'Blowdry & Styling', 600, 168, '28% Hairstylist Rule', 'unpaid', '2026-08-07 10:30:00'],
      ['com_g03', 'cmp_gech_01', 'br_female_01', 'stf_alma_03', 'Alma Getahun', 'vst_g02', 'Gel Manicure', 500, 125, '25% Nail Tech Rule', 'paid', '2026-08-07 10:55:00'],
      ['com_g04', 'cmp_gech_01', 'br_female_01', 'stf_alma_03', 'Alma Getahun', 'vst_g02', 'Deluxe Pedicure', 650, 163, '25% Nail Tech Rule', 'paid', '2026-08-07 10:55:00'],
    ],
  ]);

  // 14. Expenses
  await run(pool, `INSERT INTO expenses (id, company_id, branch_id, business_unit_id, category, amount_etb, description, payment_method, recorded_by, date, is_recurring, recurrence_frequency, next_due_date, auto_process_trigger) VALUES ?`, [
    [
      ['exp_g01', 'cmp_gech_01', 'br_female_01', null, 'rent', 35000, 'Female Salon Monthly Rent - Megersa Condo', 'cbe_birr', 'Liya Gebremedhin', '2026-08-01', 1, 'monthly', '2026-09-01', 1],
      ['exp_g02', 'cmp_gech_01', 'br_mens_01', null, 'rent', 28000, "Men's Grooming Monthly Rent - Piassa Area", 'cbe_birr', 'Samuel Desta', '2026-08-01', 1, 'monthly', '2026-09-01', 1],
      ['exp_g03', 'cmp_gech_01', 'br_female_01', null, 'utilities', 4500, 'Electricity & Water - Female Salon', 'cash', 'Liya Gebremedhin', '2026-08-01', 1, 'monthly', '2026-09-01', 0],
      ['exp_g04', 'cmp_gech_01', 'br_mens_01', null, 'utilities', 3800, 'Electricity & Water - Men\'s Grooming', 'cash', 'Samuel Desta', '2026-08-01', 1, 'monthly', '2026-09-01', 0],
      ['exp_g05', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'inventory_purchase', 12000, 'Hair color kits & keratin serum restock', 'telebirr', 'Liya Gebremedhin', '2026-08-03', 0, null, null, 0],
    ],
  ]);

  // 15. SmsLogs
  await run(pool, `INSERT INTO sms_logs (id, company_id, recipient_phone, message_type, content, status, sent_at) VALUES ?`, [
    [
      ['sms_g01', 'cmp_gech_01', '+251 91 100 2001', 'session_receipt', 'Thank you Seble! Your visit is complete. Total 3000 ETB. - Gech Beauty Salon', 'sent', '2026-08-07 10:31:00'],
      ['sms_g02', 'cmp_gech_01', '+251 91 200 3002', 'queue_turn_alert', 'Hello Haile! Your haircut is in progress at Gech Mens. Please wait.', 'sent', '2026-08-07 11:05:00'],
    ],
  ]);

  // 16. AuditLogs
  await run(pool, `INSERT INTO audit_logs (id, company_id, branch_id, action_type, description, performed_by, timestamp) VALUES ?`, [
    [
      ['aud_g01', 'cmp_gech_01', 'br_female_01', 'inventory_adjustment', 'Restocked Hair Color Kit +10 units', 'Liya Gebremedhin (Admin)', '2026-08-03 09:00:00'],
      ['aud_g02', 'cmp_gech_01', 'br_mens_01', 'commission_change', 'Updated Bereket commission to 30%', 'Samuel Desta (Admin)', '2026-08-01 10:00:00'],
      ['aud_g03', 'cmp_gech_01', 'br_female_01', 'payment_edit', 'Session Q-001 checkout completed - 3000 ETB', 'Liya Gebremedhin (Receptionist)', '2026-08-07 10:31:00'],
    ],
  ]);
}

async function seedUsers(pool: Pool) {
  await run(pool, `INSERT INTO users (id, company_id, name, email, password_hash, role) VALUES ?`, [
    [
      ['user_super', null, 'Platform Super Admin', 'admin@serenity.et', hashPassword('Admin123!'), 'super_admin'],
      ['user_gech_admin', 'cmp_gech_01', 'Gech Salon Admin', 'admin@gechsalon.et', hashPassword('Manager123!'), 'tenant_manager'],
      ['user_gech_liya', 'cmp_gech_01', 'Liya Gebremedhin', 'liya@gechsalon.et', hashPassword('Staff123!'), 'receptionist'],
      ['user_gech_bereket', 'cmp_gech_01', 'Bereket Shimelis', 'bereket@gechsalon.et', hashPassword('Staff123!'), 'staff'],
    ],
  ]);
  console.log('[seed] created user accounts (admin@gechsalon.et / Manager123!).');
}
