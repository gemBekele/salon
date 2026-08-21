import type { DbPool } from './db';
import { hashPassword, defaultPinForPhone } from './auth';
import { uid } from './core';

/**
 * Represents a login account with the new role vocabulary:
 * super_admin | owner | manager | reception | staff
 */
const USERS_SEED: [string, string | null, string, string, string, string][] = [
  ['user_super', null, 'Platform Super Admin', 'admin@serenity.et', 'Admin123!', 'super_admin'],
  ['user_gech_owner', 'cmp_gech_01', 'Gech Salon Owner', 'owner@gechsalon.et', 'Owner123!', 'owner'],
  ['user_gech_admin', 'cmp_gech_01', 'Gech Salon Manager', 'admin@gechsalon.et', 'Manager123!', 'manager'],
  ['user_gech_liya', 'cmp_gech_01', 'Liya Gebremedhin', 'liya@gechsalon.et', 'Staff123!', 'reception'],
  ['user_gech_samuel', 'cmp_gech_01', 'Samuel Desta', 'samuel@gechsalon.et', 'Staff123!', 'reception'],
  ['user_gech_bereket', 'cmp_gech_01', 'Bereket Shimelis', 'bereket@gechsalon.et', 'Staff123!', 'staff'],
  ['user_gech_hana', 'cmp_gech_01', 'Hana Abera', 'hana@gechsalon.et', 'Staff123!', 'staff'],
  ['user_gech_meron', 'cmp_gech_01', 'Meron Tadesse', 'meron@gechsalon.et', 'Staff123!', 'staff'],
  ['user_gech_alma', 'cmp_gech_01', 'Alma Getahun', 'alma@gechsalon.et', 'Staff123!', 'staff'],
  ['user_gech_fikir', 'cmp_gech_01', 'Fikir Worku', 'fikir@gechsalon.et', 'Staff123!', 'staff'],
  ['user_gech_yonatan', 'cmp_gech_01', 'Yonatan Alemayehu', 'yonatan@gechsalon.et', 'Staff123!', 'staff'],
  ['user_gech_nathan', 'cmp_gech_01', 'Nathan Tesfaye', 'nathan@gechsalon.et', 'Staff123!', 'staff'],
];

/**
 * Seeds the platform user accounts, skipping any that already exist.
 * Runs on every seed pass (unlike the reference data) so fresh installs and
 * upgraded installs both converge on the same account + role set.
 */
export async function ensureUsers(pool: DbPool): Promise<void> {
  for (const [id, companyId, name, email, password, role] of USERS_SEED) {
    await pool.query(
      `INSERT INTO users (id, company_id, name, email, password_hash, role, is_active)
       VALUES (?,?,?,?,?,?,TRUE) ON CONFLICT (id) DO NOTHING`,
      [id, companyId, name, email, hashPassword(password), role]
    );
  }
  console.log('[seed] ensured user accounts (owner@gechsalon.et / Owner123!, admin@gechsalon.et / Manager123!, staff / Staff123!).');
}

/**
 * Seeds reference data (subscription plans, companies, seed entity rows) plus
 * RBAC user accounts. Safe to run repeatedly — skips if companies already exist.
 */
export async function ensureSeeded(pool: DbPool): Promise<void> {
  const [rows] = (await pool.query(`SELECT COUNT(*) AS c FROM companies`)) as any;
  if (Number(rows[0]?.c) > 0) {
    console.log('[seed] reference data already present, skipping.');
  } else {
    console.log('[seed] populating reference data...');
    await seedReferences(pool);
    await seedUsers(pool);
    console.log('[seed] done.');
  }
  await ensureStaffPins(pool);
  await ensureUsers(pool);
  await ensureBanks(pool);
  await ensureBundles(pool);
  await ensureInventorySellingPrices(pool);
}

/**
 * Backfill default PINs (last 4 digits of phone, scrypt-hashed) for any staff
 * member that does not have a PIN yet. Idempotent.
 */
export async function ensureStaffPins(pool: DbPool): Promise<void> {
  const [rows] = (await pool.query(`SELECT id, phone FROM staff WHERE pin_hash IS NULL`)) as any;
  if (!rows.length) return;
  for (const r of rows) {
    const defaultPin = defaultPinForPhone(r.phone);
    await pool.query(
      `UPDATE staff SET pin_hash = ?, pin_changed = FALSE WHERE id = ?`,
      [hashPassword(defaultPin), r.id]
    );
    console.log(`[seed] generated default PIN for ${r.id} (${defaultPin}) — staff must change on first login.`);
  }
}

/**
 * Backfill the configured bank list for any company that has none. Idempotent.
 */
export async function ensureBanks(pool: DbPool): Promise<void> {
  const [companyRows] = (await pool.query(`SELECT id FROM companies`)) as any;
  for (const company of companyRows) {
    const [existing] = (await pool.query(`SELECT COUNT(*) AS c FROM banks WHERE company_id = ?`, [company.id])) as any;
    if (Number(existing[0]?.c) > 0) continue;
    await insertMany(pool, 'banks', ['id', 'company_id', 'name', 'code', 'is_active'], [
      [`bank_cbe_${company.id.slice(-4)}`, company.id, 'CBE Birr', 'cbe_birr', 1],
      [`bank_telebirr_${company.id.slice(-4)}`, company.id, 'Telebirr', 'telebirr', 1],
      [`bank_awash_${company.id.slice(-4)}`, company.id, 'Awash Bank', 'awash', 1],
      [`bank_dashen_${company.id.slice(-4)}`, company.id, 'Dashen Bank', 'dashen', 1],
      [`bank_abyssinia_${company.id.slice(-4)}`, company.id, 'Bank of Abyssinia', 'abyssinia', 1],
      [`bank_oromia_${company.id.slice(-4)}`, company.id, 'Oromia Bank', 'oromia', 1],
    ]);
    console.log(`[seed] backfilled ${6} banks for ${company.id}`);
  }
}

/**
 * Backfill a demo bundle for companies that have none. Idempotent.
 */
export async function ensureBundles(pool: DbPool): Promise<void> {
  const [companyRows] = (await pool.query(`SELECT id FROM companies`)) as any;
  for (const company of companyRows) {
    const [existing] = (await pool.query(`SELECT COUNT(*) AS c FROM service_bundles WHERE company_id = ?`, [company.id])) as any;
    if (Number(existing[0]?.c) > 0) continue;
    const [services] = (await pool.query(`SELECT id, name, price_etb FROM services WHERE company_id = ? ORDER BY "created_at" LIMIT 3`, [company.id])) as any;
    if (!services.length) continue;
    const [branch] = (await pool.query(`SELECT id FROM branches WHERE company_id = ? LIMIT 1`, [company.id])) as any;
    const branchId = branch[0]?.id || null;
    const bundleId = `bnd_demo_${company.id.slice(-4)}`;
    await pool.query(`INSERT INTO service_bundles (id, company_id, branch_id, business_unit_id, name, description, is_active) VALUES (?,?,?,?,?,?,TRUE)`,
      [bundleId, company.id, branchId, null, 'Demo Bundle', 'Sample bundle created automatically']);
    for (const svc of services) {
      await pool.query(`INSERT INTO service_bundle_items (id, bundle_id, service_id, price_etb) VALUES (?,?,?,?)`,
        [uid('bndi'), bundleId, svc.id, Math.round(Number(svc.price_etb) * 0.85)]);
    }
    console.log(`[seed] created demo bundle for ${company.id}`);
  }
}

/**
 * Backfill a selling price (unit cost + 50% markup) for inventory items that
 * are missing one, so reception retail can sell them. Idempotent.
 */
export async function ensureInventorySellingPrices(pool: DbPool): Promise<void> {
  const [rows] = (await pool.query(`SELECT id, unit_cost_etb, selling_price_etb FROM inventory_items WHERE selling_price_etb IS NULL`)) as any;
  for (const r of rows) {
    const price = Number(r.selling_price_etb ?? 0) || Math.round(Number(r.unit_cost_etb || 0) * 1.5);
    await pool.query(`UPDATE inventory_items SET selling_price_etb = ? WHERE id = ?`, [price, r.id]);
  }
}

/** Multi-row insert using `?` placeholders (rewritten to $n by the pg adapter). */
async function insertMany(pool: DbPool, table: string, columns: string[], rows: any[][]): Promise<void> {
  if (!rows.length) return;
  const rowGroups = rows.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
  await pool.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${rowGroups}`, rows.flat());
}

async function seedReferences(pool: DbPool) {
  // 1. SubscriptionPlans
  await insertMany(
    pool,
    'subscription_plans',
    ['id', 'name', 'max_branches', 'max_business_units', 'max_staff', 'monthly_fee_etb', 'features'],
    [
      ['plan_starter', 'Single Location Starter', 1, 2, 10, 3500, '["1 Branch","Receptionist POS","Basic Reports","SMS Receipts"]'],
      ['plan_growth', 'Multi-Unit Growth', 3, 8, 35, 8500, '["Up to 3 Branches","Multi-Unit Scoping","Commission Engine","Auto-Deduction","Queue Display"]'],
      ['plan_enterprise', 'Enterprise Multi-City Group', 15, 50, 200, 19500, '["Unlimited Branches across Cities","SaaS SLA & Audit Logs","AI Shift Optimizer","Custom Commission Rules"]'],
    ]
  );

  // 2. Companies — Gech Beauty Salon
  await insertMany(pool, 'companies', ['id', 'name', 'slug', 'subscription_plan_id', 'status', 'currency', 'timezone', 'phone', 'email', 'created_at'], [
    ['cmp_gech_01', 'Gech Beauty Salon', 'gech-beauty-salon', 'plan_growth', 'active', 'ETB', 'Africa/Addis_Ababa', '+251 91 456 7890', 'info@gechsalon.et', '2024-06-01 00:00:00'],
  ]);

  // 2b. Banks (configurable payment channels)
  await insertMany(pool, 'banks', ['id', 'company_id', 'name', 'code', 'is_active'], [
    ['bank_cbe', 'cmp_gech_01', 'CBE Birr', 'cbe_birr', 1],
    ['bank_telebirr', 'cmp_gech_01', 'Telebirr', 'telebirr', 1],
    ['bank_awash', 'cmp_gech_01', 'Awash Bank', 'awash', 1],
    ['bank_dashen', 'cmp_gech_01', 'Dashen Bank', 'dashen', 1],
    ['bank_abyssinia', 'cmp_gech_01', 'Bank of Abyssinia', 'abyssinia', 1],
    ['bank_oromia', 'cmp_gech_01', 'Oromia Bank', 'oromia', 1],
  ]);

  // 3. Branches — Female Salon & Men's Grooming in Hawassa
  await insertMany(pool, 'branches', ['id', 'company_id', 'name', 'city', 'address', 'phone', 'is_main_branch', 'status'], [
    ['br_female_01', 'cmp_gech_01', 'Gech Female Beauty Salon', 'Hawassa', 'Megersa Condo, 2nd Floor, Hawassa', '+251 91 456 7890', 1, 'active'],
    ['br_mens_01', 'cmp_gech_01', 'Gech Men\'s Grooming Lounge', 'Hawassa', 'Piassa Area, Near Hawassa University Gate', '+251 91 456 7891', 0, 'active'],
  ]);

  // 4. Business Units
  await insertMany(pool, 'business_units', ['id', 'company_id', 'branch_id', 'type', 'name', 'code', 'status'], [
    ['bu_female_hair', 'cmp_gech_01', 'br_female_01', 'womens_salon', 'Hair Styling & Braids', 'FS-HAIR-01', 'active'],
    ['bu_female_nails', 'cmp_gech_01', 'br_female_01', 'spa_center', 'Nail Art & Manicure/Pedicure', 'FS-NAIL-02', 'active'],
    ['bu_female_skin', 'cmp_gech_01', 'br_female_01', 'spa_center', 'Skincare & Facials', 'FS-SKIN-03', 'active'],
    ['bu_mens_hair', 'cmp_gech_01', 'br_mens_01', 'mens_salon', 'Haircut & Styling', 'MG-HAIR-01', 'active'],
    ['bu_mens_grooming', 'cmp_gech_01', 'br_mens_01', 'mens_salon', 'Beard & Shave', 'MG-BEARD-02', 'active'],
    ['bu_mens_facial', 'cmp_gech_01', 'br_mens_01', 'spa_center', 'Facial & Skincare', 'MG-FACE-03', 'active'],
  ]);

  // 5. Staff
  await insertMany(pool, 'staff', ['id', 'company_id', 'branch_id', 'business_unit_id', 'name', 'phone', 'email', 'role', 'specialties', 'default_commission_percentage', 'status'], [
    // Female Salon Staff
    ['stf_hana_01', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Hana Abera', '+251 91 111 2233', 'hana@gechsalon.et', 'hairstylist', '["Hair Coloring","Blowdry","Keratin Treatment"]', 28, 'available'],
    ['stf_meron_02', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Meron Tadesse', '+251 91 222 3344', 'meron@gechsalon.et', 'hairstylist', '["Habesha Braids","Cornrows","Twist Outs"]', 30, 'available'],
    ['stf_alma_03', 'cmp_gech_01', 'br_female_01', 'bu_female_nails', 'Alma Getahun', '+251 91 333 4455', 'alma@gechsalon.et', 'esthetician', '["Gel Nails","French Manicure","Nail Art"]', 25, 'available'],
    ['stf_fikir_04', 'cmp_gech_01', 'br_female_01', 'bu_female_skin', 'Fikir Worku', '+251 92 444 5566', 'fikir@gechsalon.et', 'esthetician', '["HydraFacial","Chemical Peel","Acne Treatment"]', 30, 'available'],
    ['stf_reception_05', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Liya Gebremedhin', '+251 93 555 6677', 'liya@gechsalon.et', 'reception', '["POS Operations","Customer Care","Appointments"]', 0, 'available'],
    // Men's Grooming Staff
    ['stf_bereket_06', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Bereket Shimelis', '+251 91 666 7788', 'bereket@gechsalon.et', 'barber', '["Fade Cut","Classic Taper","Flat Top"]', 30, 'available'],
    ['stf_yonatan_07', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'Yonatan Alemayehu', '+251 91 777 8899', 'yonatan@gechsalon.et', 'barber', '["Beard Sculpting","Hot Towel Shave","Razor Lineup"]', 28, 'available'],
    ['stf_nathan_08', 'cmp_gech_01', 'br_mens_01', 'bu_mens_facial', 'Nathan Tesfaye', '+251 92 888 9900', 'nathan@gechsalon.et', 'esthetician', '["Men Facial","Deep Cleanse","Anti-Acne"]', 25, 'available'],
    ['stf_mens_rec_09', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Samuel Desta', '+251 93 999 0011', 'samuel@gechsalon.et', 'reception', '["POS Operations","Queue Management","SMS Receipts"]', 0, 'available'],
  ]);

  // 6. Services — Amharic Service Catalog
  await insertMany(pool, 'services', ['id', 'company_id', 'business_unit_id', 'name', 'category', 'price_etb', 'duration_minutes', 'commission_type', 'commission_value', 'is_active'], [
    // ፀጉር — Hair
    ['srv_amh_01', 'cmp_gech_01', 'bu_female_hair', 'ፀጉር መታጠብ', 'ፀጉር', 150, 30, 'percentage', 25, 1],
    ['srv_amh_02', 'cmp_gech_01', 'bu_female_hair', 'ትሪትመንት መታጠብ', 'ፀጉር', 100, 30, 'percentage', 25, 1],
    ['srv_amh_03', 'cmp_gech_01', 'bu_female_hair', 'ካክስ', 'ፀጉር', 200, 30, 'percentage', 25, 1],
    ['srv_amh_04', 'cmp_gech_01', 'bu_female_hair', 'ዊግ ማጠብ', 'ፀጉር', 150, 30, 'percentage', 25, 1],
    ['srv_amh_05', 'cmp_gech_01', 'bu_female_hair', 'ዊግ በቢጎዲን አጥቦ ማድረቅ', 'ፀጉር', 250, 30, 'percentage', 25, 1],
    ['srv_amh_06', 'cmp_gech_01', 'bu_female_hair', 'ሳብሳብ', 'ፀጉር', 250, 30, 'percentage', 25, 1],
    ['srv_amh_07', 'cmp_gech_01', 'bu_female_hair', 'ፔስትራ', 'ፀጉር', 300, 30, 'percentage', 25, 1],
    ['srv_amh_08', 'cmp_gech_01', 'bu_female_hair', 'ፔስትራ በዊግ', 'ፀጉር', 300, 30, 'percentage', 25, 1],
    ['srv_amh_09', 'cmp_gech_01', 'bu_female_hair', 'ዌቭ በፀጉር', 'ፀጉር', 400, 30, 'percentage', 25, 1],
    ['srv_amh_10', 'cmp_gech_01', 'bu_female_hair', 'ዌብ በዊግ', 'ፀጉር', 500, 30, 'percentage', 25, 1],
    ['srv_amh_11', 'cmp_gech_01', 'bu_female_hair', 'ፖኒተር በፀጉር', 'ፀጉር', 600, 30, 'percentage', 25, 1],
    ['srv_amh_12', 'cmp_gech_01', 'bu_female_hair', 'ፖኒተር በዊግ ተፈሽኖ', 'ፀጉር', 800, 30, 'percentage', 25, 1],
    ['srv_amh_13', 'cmp_gech_01', 'bu_female_hair', 'ፖኒተር ብቻ', 'ፀጉር', 600, 30, 'percentage', 25, 1],
    ['srv_amh_14', 'cmp_gech_01', 'bu_female_hair', 'ቤቢ ሄር ሙሉ', 'ፀጉር', 100, 30, 'percentage', 25, 1],
    ['srv_amh_15', 'cmp_gech_01', 'bu_female_hair', 'ቤቢ ሄር በግማሽ', 'ፀጉር', 50, 30, 'percentage', 25, 1],
    ['srv_amh_16', 'cmp_gech_01', 'bu_female_hair', 'ፎም', 'ፀጉር', 150, 30, 'percentage', 25, 1],
    ['srv_amh_17', 'cmp_gech_01', 'bu_female_hair', 'ፀጉር መቁረጥ', 'ፀጉር', 400, 30, 'percentage', 25, 1],
    ['srv_amh_18', 'cmp_gech_01', 'bu_female_hair', 'እስትሮ በፀጉር', 'ፀጉር', 500, 30, 'percentage', 25, 1],
    ['srv_amh_19', 'cmp_gech_01', 'bu_female_hair', 'ፀጉር ቁርጥ ከነመሥሪያው', 'ፀጉር', 600, 30, 'percentage', 25, 1],
    ['srv_amh_20', 'cmp_gech_01', 'bu_female_hair', 'የተቆረጠ ፀጉር ፔስትራ', 'ፀጉር', 400, 30, 'percentage', 25, 1],
    ['srv_amh_21', 'cmp_gech_01', 'bu_female_hair', 'ዊግ መቁረጥ', 'ፀጉር', 100, 30, 'percentage', 25, 1],
    ['srv_amh_22', 'cmp_gech_01', 'bu_female_hair', 'ፀጉር መፈረዝ', 'ፀጉር', 150, 30, 'percentage', 25, 1],
    ['srv_amh_23', 'cmp_gech_01', 'bu_female_hair', 'ሌንስ ከነመሥሪያው', 'ፀጉር', 1000, 30, 'percentage', 25, 1],
    ['srv_amh_24', 'cmp_gech_01', 'bu_female_hair', 'ሌንስ መለጠፍ', 'ፀጉር', 600, 30, 'percentage', 25, 1],
    ['srv_amh_25', 'cmp_gech_01', 'bu_female_hair', 'ሻምፖኦ', 'ፀጉር', 50, 30, 'percentage', 25, 1],
    ['srv_amh_26', 'cmp_gech_01', 'bu_female_hair', 'ኮንድሽነር', 'ፀጉር', 50, 30, 'percentage', 25, 1],
    ['srv_amh_27', 'cmp_gech_01', 'bu_female_hair', 'እስክራፕ', 'ፀጉር', 150, 30, 'percentage', 25, 1],
    ['srv_amh_28', 'cmp_gech_01', 'bu_female_hair', 'ፀጉር ቀለም መቀባት', 'ፀጉር', 4000, 30, 'percentage', 25, 1],
    ['srv_amh_29', 'cmp_gech_01', 'bu_female_hair', 'የፀጉር ቀለም ሀይላይት', 'ፀጉር', 5000, 30, 'percentage', 25, 1],
    ['srv_amh_30', 'cmp_gech_01', 'bu_female_hair', 'ሂውማን ሀይላይት ቀለም', 'ፀጉር', 6000, 30, 'percentage', 25, 1],
    ['srv_amh_31', 'cmp_gech_01', 'bu_female_hair', 'Black Shampoo', 'ፀጉር', 100, 30, 'percentage', 25, 1],
    ['srv_amh_32', 'cmp_gech_01', 'bu_female_hair', 'ሎላን ቀለም መቀባት', 'ፀጉር', 500, 30, 'percentage', 25, 1],
    // ሹርባ — Shurba & Braids
    ['srv_amh_33', 'cmp_gech_01', 'bu_female_hair', 'ሹርባ በፀጉር', 'ሹርባ', 150, 30, 'percentage', 25, 1],
    ['srv_amh_34', 'cmp_gech_01', 'bu_female_hair', 'ሸርባ በዊግ', 'ሹርባ', 200, 30, 'percentage', 25, 1],
    ['srv_amh_35', 'cmp_gech_01', 'bu_female_hair', 'ቁጥርጥር በፀጉር', 'ሹርባ', 200, 30, 'percentage', 25, 1],
    ['srv_amh_36', 'cmp_gech_01', 'bu_female_hair', 'ትዊስት በፀጉር', 'ሹርባ', 250, 30, 'percentage', 25, 1],
    ['srv_amh_37', 'cmp_gech_01', 'bu_female_hair', 'የፊት ሹርባ', 'ሹርባ', 100, 30, 'percentage', 25, 1],
    ['srv_amh_38', 'cmp_gech_01', 'bu_female_hair', 'የፊት ሹርባ ከዋላ ቁጥርጥር በፀጉር', 'ሹርባ', 200, 30, 'percentage', 25, 1],
    ['srv_amh_39', 'cmp_gech_01', 'bu_female_hair', 'ቀጭን ቁጥርጥር በአድ ዊግ', 'ሹርባ', 300, 30, 'percentage', 25, 1],
    ['srv_amh_40', 'cmp_gech_01', 'bu_female_hair', 'ገመድ ቁጥርጥር በአድ ዊግ', 'ሹርባ', 250, 30, 'percentage', 25, 1],
    ['srv_amh_41', 'cmp_gech_01', 'bu_female_hair', 'ገመድ ኪሮሽ', 'ሹርባ', 400, 30, 'percentage', 25, 1],
    ['srv_amh_42', 'cmp_gech_01', 'bu_female_hair', 'ድሬድ ቁጥርጥር አንድ ዊግ', 'ሹርባ', 250, 30, 'percentage', 25, 1],
    ['srv_amh_43', 'cmp_gech_01', 'bu_female_hair', 'አለባሶ', 'ሹርባ', 700, 30, 'percentage', 25, 1],
    ['srv_amh_44', 'cmp_gech_01', 'bu_female_hair', 'ስፌት', 'ሹርባ', 350, 30, 'percentage', 25, 1],
    ['srv_amh_45', 'cmp_gech_01', 'bu_female_hair', 'ስግስግ', 'ሹርባ', 400, 30, 'percentage', 25, 1],
    ['srv_amh_46', 'cmp_gech_01', 'bu_female_hair', 'የኬንያ ዊግ አንድ', 'ሹርባ', 200, 30, 'percentage', 25, 1],
    ['srv_amh_47', 'cmp_gech_01', 'bu_female_hair', 'ስፌት በዊግ', 'ሹርባ', 2000, 30, 'percentage', 25, 1],
    ['srv_amh_48', 'cmp_gech_01', 'bu_female_hair', 'የኬንያ ዊግ ከለር', 'ሹርባ', 250, 30, 'percentage', 25, 1],
    ['srv_amh_49', 'cmp_gech_01', 'bu_female_hair', 'ፕላሴታ', 'ሹርባ', 100, 30, 'percentage', 25, 1],
    ['srv_amh_50', 'cmp_gech_01', 'bu_female_hair', 'የቁጥርጥር መፍቻ', 'ሹርባ', 300, 30, 'percentage', 25, 1],
    ['srv_amh_51', 'cmp_gech_01', 'bu_female_hair', 'ስፌት መፍታት', 'ሹርባ', 150, 30, 'percentage', 25, 1],
    ['srv_amh_52', 'cmp_gech_01', 'bu_female_hair', 'ባዶ ሹርባ መፍታት', 'ሹርባ', 150, 30, 'percentage', 25, 1],
    ['srv_amh_53', 'cmp_gech_01', 'bu_female_hair', 'ግሎ መለጠፍ ፍሸና', 'ሹርባ', 100, 30, 'percentage', 25, 1],
    ['srv_amh_54', 'cmp_gech_01', 'bu_female_hair', 'ከፊት ሹርባ ከዋላ ስፌት', 'ሹርባ', 500, 30, 'percentage', 25, 1],
    // ሜካፕ — Makeup
    ['srv_amh_55', 'cmp_gech_01', 'bu_female_hair', 'ሜካፕ', 'ሜካፕ', 3000, 30, 'percentage', 25, 1],
    ['srv_amh_56', 'cmp_gech_01', 'bu_female_hair', 'ሜካፕ ከአይላሽ ጋር', 'ሜካፕ', 3500, 30, 'percentage', 25, 1],
    ['srv_amh_57', 'cmp_gech_01', 'bu_female_hair', 'አይላሽ', 'ሜካፕ', 500, 30, 'percentage', 25, 1],
    ['srv_amh_58', 'cmp_gech_01', 'bu_female_hair', 'አይላሽ ዋን ባይ ዋን', 'ሜካፕ', 2000, 30, 'percentage', 25, 1],
    ['srv_amh_59', 'cmp_gech_01', 'bu_female_hair', 'ሊፕስቲክ መቀባት', 'ሜካፕ', 300, 30, 'percentage', 25, 1],
    // ጥፍር — Nails
    ['srv_amh_60', 'cmp_gech_01', 'bu_female_nails', 'ጥፍር መተከል', 'ጥፍር', 450, 30, 'percentage', 25, 1],
    ['srv_amh_61', 'cmp_gech_01', 'bu_female_nails', 'ሽላክ ጥፍር መቀባት', 'ጥፍር', 300, 30, 'percentage', 25, 1],
    ['srv_amh_62', 'cmp_gech_01', 'bu_female_nails', 'የጥፍር ጄል', 'ጥፍር', 850, 30, 'percentage', 25, 1],
    ['srv_amh_63', 'cmp_gech_01', 'bu_female_nails', 'ጄል በሽላክ ጥፍር', 'ጥፍር', 1100, 30, 'percentage', 25, 1],
    ['srv_amh_64', 'cmp_gech_01', 'bu_female_nails', 'የጥፍር ጄል ማሥለቀቅ', 'ጥፍር', 100, 30, 'percentage', 25, 1],
    ['srv_amh_65', 'cmp_gech_01', 'bu_female_nails', 'የጥፍር ሽላክ ማሥለቀቅ', 'ጥፍር', 100, 30, 'percentage', 25, 1],
    ['srv_amh_66', 'cmp_gech_01', 'bu_female_nails', 'የጥፍር ፈርጥ', 'ጥፍር', 50, 30, 'percentage', 25, 1],
    ['srv_amh_67', 'cmp_gech_01', 'bu_female_nails', 'ጀል አንድ ጥፍር', 'ጥፍር', 150, 30, 'percentage', 25, 1],
    ['srv_amh_68', 'cmp_gech_01', 'bu_female_nails', 'አንድ ጥፍር መተከል', 'ጥፍር', 100, 30, 'percentage', 25, 1],
    ['srv_amh_69', 'cmp_gech_01', 'bu_female_nails', 'የጥፍር ጄል እሪፊል', 'ጥፍር', 500, 30, 'percentage', 25, 1],
    // ቅድብ — Threading
    ['srv_amh_70', 'cmp_gech_01', 'bu_female_skin', 'ቅድብ በኩል', 'ቅድብ', 200, 30, 'percentage', 25, 1],
    ['srv_amh_71', 'cmp_gech_01', 'bu_female_skin', 'ቅድብ በሂና', 'ቅድብ', 250, 30, 'percentage', 25, 1],
    ['srv_amh_72', 'cmp_gech_01', 'bu_female_skin', 'ቅድብ በክር', 'ቅድብ', 100, 30, 'percentage', 25, 1],
    ['srv_amh_73', 'cmp_gech_01', 'bu_female_skin', 'ቅድብ በምላጭ', 'ቅድብ', 50, 30, 'percentage', 25, 1],
    ['srv_amh_74', 'cmp_gech_01', 'bu_female_skin', 'ቅድብ በሜሽ', 'ቅድብ', 400, 30, 'percentage', 25, 1],
    // እስፓ — Spa
    ['srv_amh_75', 'cmp_gech_01', 'bu_female_skin', 'ሞሮኮ ኖርማል', 'እስፓ', 2000, 30, 'percentage', 25, 1],
    ['srv_amh_76', 'cmp_gech_01', 'bu_female_skin', 'እስፔሻል ሞሮኮ', 'እስፓ', 2800, 30, 'percentage', 25, 1],
    ['srv_amh_77', 'cmp_gech_01', 'bu_female_skin', 'እስፔሻል ሞሮኮ ከፀጉር ጋር', 'እስፓ', 3300, 30, 'percentage', 25, 1],
    ['srv_amh_78', 'cmp_gech_01', 'bu_female_skin', 'ኖርማል ሞሮኮ ከፀጉር ትሪትመንት ጋር', 'እስፓ', 2500, 30, 'percentage', 25, 1],
    ['srv_amh_79', 'cmp_gech_01', 'bu_female_skin', 'አሮማ ማሣጂ', 'እስፓ', 1200, 30, 'percentage', 25, 1],
    ['srv_amh_80', 'cmp_gech_01', 'bu_female_skin', 'ኖርማል ማሣጂ', 'እስፓ', 1000, 30, 'percentage', 25, 1],
    ['srv_amh_81', 'cmp_gech_01', 'bu_female_skin', 'ከወገብ በታች ማሣጂ', 'እስፓ', 500, 30, 'percentage', 25, 1],
    ['srv_amh_82', 'cmp_gech_01', 'bu_female_skin', 'ከወገብ በላይ መሣጂ', 'እስፓ', 500, 30, 'percentage', 25, 1],
    ['srv_amh_83', 'cmp_gech_01', 'bu_female_skin', 'ኖርማል ወይባ', 'እስፓ', 2000, 30, 'percentage', 25, 1],
    ['srv_amh_84', 'cmp_gech_01', 'bu_female_skin', 'እስፔሻል ወይባ', 'እስፓ', 2800, 30, 'percentage', 25, 1],
    // Extra — Drinks & Accessories
    ['srv_amh_85', 'cmp_gech_01', 'bu_female_hair', 'ማካፈያ', 'Extra', 50, 30, 'percentage', 25, 1],
    ['srv_amh_86', 'cmp_gech_01', 'bu_female_hair', 'ብሩሽ', 'Extra', 50, 30, 'percentage', 25, 1],
    ['srv_amh_87', 'cmp_gech_01', 'bu_female_hair', 'ቅቤ', 'Extra', 200, 30, 'percentage', 25, 1],
    ['srv_amh_88', 'cmp_gech_01', 'bu_female_hair', 'ጁስ', 'Extra', 150, 30, 'percentage', 25, 1],
    ['srv_amh_89', 'cmp_gech_01', 'bu_female_hair', 'Soft Drink', 'Extra', 50, 30, 'percentage', 25, 1],
    ['srv_amh_90', 'cmp_gech_01', 'bu_female_hair', 'Small Water', 'Extra', 30, 30, 'percentage', 25, 1],
    ['srv_amh_91', 'cmp_gech_01', 'bu_female_hair', 'Medium Water', 'Extra', 40, 30, 'percentage', 25, 1],
    ['srv_amh_92', 'cmp_gech_01', 'bu_female_hair', 'Big Water', 'Extra', 60, 30, 'percentage', 25, 1],
    // Men's Grooming Lounge — Haircut & Styling
    ['srv_mens_01', 'cmp_gech_01', 'bu_mens_hair', 'የፀጉር መቁረጥ', 'ፀጉር', 300, 30, 'percentage', 25, 1],
    ['srv_mens_02', 'cmp_gech_01', 'bu_mens_hair', 'ፍሬድ መቁረጥ', 'ፀጉር', 400, 45, 'percentage', 25, 1],
    ['srv_mens_03', 'cmp_gech_01', 'bu_mens_hair', 'ፀጉር ማጠብ ከመቁረጥ ጋር', 'ፀጉር', 450, 60, 'percentage', 25, 1],
    ['srv_mens_04', 'cmp_gech_01', 'bu_mens_hair', 'የፀጉር ቀለም መቀባት', 'ፀጉር', 2000, 90, 'percentage', 25, 1],
    ['srv_mens_05', 'cmp_gech_01', 'bu_mens_hair', 'የፀጉር ቅርፅ ማስተካከያ', 'ፀጉር', 150, 30, 'percentage', 25, 1],
    ['srv_mens_06', 'cmp_gech_01', 'bu_mens_hair', 'ደረቅ ፀጉር ቅርፅ', 'ፀጉር', 100, 20, 'percentage', 25, 1],
    // Men's Grooming Lounge — Beard & Shave
    ['srv_mens_07', 'cmp_gech_01', 'bu_mens_grooming', 'ጺም መከርከም', 'ጺም', 150, 20, 'percentage', 25, 1],
    ['srv_mens_08', 'cmp_gech_01', 'bu_mens_grooming', 'ሙሉ ምላጭ', 'ጺም', 250, 30, 'percentage', 25, 1],
    ['srv_mens_09', 'cmp_gech_01', 'bu_mens_grooming', 'ጺም ቅርፅ ማስተካከያ', 'ጺም', 200, 25, 'percentage', 25, 1],
    ['srv_mens_10', 'cmp_gech_01', 'bu_mens_grooming', 'የውሃ ፎጣ ሽብስ', 'ጺም', 100, 15, 'percentage', 25, 1],
    ['srv_mens_11', 'cmp_gech_01', 'bu_mens_grooming', 'ጺም ቀለም መቀባት', 'ጺም', 300, 30, 'percentage', 25, 1],
    ['srv_mens_12', 'cmp_gech_01', 'bu_mens_grooming', 'ላይኛ ጺም መከርከም', 'ጺም', 100, 15, 'percentage', 25, 1],
    // Men's Grooming Lounge — Facial & Skincare
    ['srv_mens_13', 'cmp_gech_01', 'bu_mens_facial', 'የወንዶች ገጽ ንፅህና', 'ገጽ', 600, 45, 'percentage', 25, 1],
    ['srv_mens_14', 'cmp_gech_01', 'bu_mens_facial', 'ጥልቅ ገጽ መፋቅ', 'ገጽ', 500, 40, 'percentage', 25, 1],
    ['srv_mens_15', 'cmp_gech_01', 'bu_mens_facial', 'የገጽ ቀዳዳ ህክምና', 'ገጽ', 450, 35, 'percentage', 25, 1],
    ['srv_mens_16', 'cmp_gech_01', 'bu_mens_facial', 'እንቁላል መፋቅ', 'ገጽ', 450, 40, 'percentage', 25, 1],
    ['srv_mens_17', 'cmp_gech_01', 'bu_mens_facial', 'የገጽ ቅባት', 'ገጽ', 400, 35, 'percentage', 25, 1],
  ]);

  // 6b. Service bundles (per-sub-service prices define the bundle total)
  await insertMany(pool, 'service_bundles', ['id', 'company_id', 'branch_id', 'business_unit_id', 'name', 'description', 'is_active'], [
    ['bnd_spa_day', 'cmp_gech_01', 'br_female_01', 'bu_female_skin', 'Moroccan Spa Day', 'Full spa package: Moroccan bath + massage + hair wash', 1],
    ['bnd_color_treat', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Color & Treatment', 'Hair color with treatment wash', 1],
  ]);
  await insertMany(pool, 'service_bundle_items', ['id', 'bundle_id', 'service_id', 'price_etb'], [
    ['bndi_spa_01', 'bnd_spa_day', 'srv_amh_75', 1800],
    ['bndi_spa_02', 'bnd_spa_day', 'srv_amh_80', 900],
    ['bndi_spa_03', 'bnd_spa_day', 'srv_amh_01', 120],
    ['bndi_col_01', 'bnd_color_treat', 'srv_amh_28', 3800],
    ['bndi_col_02', 'bnd_color_treat', 'srv_amh_02', 90],
  ]);

  // 7. InventoryItems
  await insertMany(pool, 'inventory_items', ['id', 'company_id', 'branch_id', 'business_unit_id', 'name', 'sku', 'unit', 'current_stock', 'reorder_level', 'unit_cost_etb', 'selling_price_etb', 'last_restocked_at'], [
    // Female Salon
    ['inv_hair_color', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Professional Hair Color Kit', 'COL-PRF-500', 'pcs', 20, 5, 850, 1200, '2026-08-01'],
    ['inv_keratin', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Keratin Treatment Serum', 'KRT-SRM-200', 'btl', 12, 3, 1200, 1800, '2026-08-03'],
    ['inv_hair_ext', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Brazilian Hair Extension Bundle', 'EXT-BRA-100', 'pcs', 8, 2, 2500, 3200, '2026-07-28'],
    ['inv_gel_polish', 'cmp_gech_01', 'br_female_01', 'bu_female_nails', 'Gel Nail Polish Collection', 'NLP-GEL-30', 'set', 6, 2, 450, 750, '2026-08-05'],
    ['inv_nail_remover', 'cmp_gech_01', 'br_female_01', 'bu_female_nails', 'Acetone-Free Remover', 'NLR-ACT-500', 'ml', 800, 200, 8, 20, '2026-08-02'],
    ['inv_facial_kit', 'cmp_gech_01', 'br_female_01', 'bu_female_skin', 'HydraFacial Treatment Kit', 'FCL-HYD-10', 'pcs', 15, 5, 350, 600, '2026-08-04'],
    // Retail-only products (sold by reception, not tied to a service)
    ['inv_retail_shampoo', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Argan Oil Shampoo 400ml', 'RT-SHP-AR-400', 'btl', 40, 10, 320, 550, '2026-08-06'],
    ['inv_retail_serum', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Hair Repair Serum 100ml', 'RT-SRM-HR-100', 'btl', 25, 6, 260, 480, '2026-08-06'],
    ['inv_retail_beard_oil', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'Beard & Mustache Oil 50ml', 'RT-BO-50', 'btl', 20, 5, 380, 650, '2026-08-06'],
    ['inv_retail_comb', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Barber Comb (Wooden)', 'RT-CMB-WD', 'pcs', 60, 15, 60, 150, '2026-08-06'],
    // Men's Grooming
    ['inv_pomade', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Premium Hold Pomade', 'POM-PRM-150', 'pcs', 30, 10, 180, 350, '2026-08-03'],
    ['inv_shaving_cream', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'Classic Shaving Cream', 'SHV-CLS-200', 'pcs', 25, 8, 95, 220, '2026-08-01'],
    ['inv_hot_towel', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'Hot Towel Wraps (Disposable)', 'TWL-HT-100', 'pcs', 100, 30, 15, 30, '2026-08-05'],
    ['inv_aftershave', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'Aftershave Balm', 'SHV-AFT-150', 'pcs', 18, 5, 120, 280, '2026-08-02'],
    ['inv_mens_facial_kit', 'cmp_gech_01', 'br_mens_01', 'bu_mens_facial', 'Men Deep Cleanse Facial Kit', 'FCL-MEN-10', 'pcs', 10, 3, 280, 520, '2026-08-04'],
  ]);

  // 8. ServiceInventoryRequirements
  await insertMany(pool, 'service_inventory_requirements', ['service_id', 'inventory_item_id', 'quantity_used'], [
    ['srv_amh_28', 'inv_hair_color', 1],
    ['srv_amh_17', 'inv_pomade', 1],
    ['srv_amh_60', 'inv_gel_polish', 1],
    ['srv_amh_63', 'inv_gel_polish', 2],
    ['srv_amh_75', 'inv_facial_kit', 1],
  ]);

  // 9. Customers
  await insertMany(pool, 'customers', ['id', 'company_id', 'name', 'phone', 'email', 'total_visits', 'total_spent_etb', 'loyalty_points', 'is_vip', 'notes', 'created_at'], [
    ['cust_seble_01', 'cmp_gech_01', 'Seble Mulugeta', '+251 91 100 2001', 'seble.m@gmail.com', 15, 22500, 675, 1, 'Regular VIP, prefers Hana for coloring', '2024-08-15 00:00:00'],
    ['cust_haile_02', 'cmp_gech_01', 'Haile Gebreselassie', '+251 91 200 3002', null, 8, 5200, 156, 0, 'Weekly haircut client', '2025-01-10 00:00:00'],
    ['cust_fasika_03', 'cmp_gech_01', 'Fasika Demissie', '+251 92 300 4003', 'fasika.d@yahoo.com', 6, 11000, 330, 0, null, '2025-03-20 00:00:00'],
    ['cust_tesfaye_04', 'cmp_gech_01', 'Tesfaye Alemu', '+251 93 400 5004', null, 12, 7800, 234, 1, 'Loyal men\'s grooming client', '2024-11-05 00:00:00'],
    ['cust_miheret_05', 'cmp_gech_01', 'Miheret Kassahun', '+251 91 500 6005', 'miheret.k@gmail.com', 4, 8200, 246, 0, 'First-time facial, sensitive skin', '2026-06-01 00:00:00'],
    ['cust_selam_06', 'cmp_gech_01', 'Selam Worku', '+251 91 600 7006', null, 3, 1200, 36, 0, 'Coloring every month', '2025-09-12 00:00:00'],
    ['cust_dawit_07', 'cmp_gech_01', 'Dawit Mekonnen', '+251 92 700 8007', 'dawit.m@gmail.com', 5, 2100, 63, 0, 'Fade cut regular', '2025-02-18 00:00:00'],
    ['cust_hiwot_08', 'cmp_gech_01', 'Hiwot Assefa', '+251 91 800 9008', 'hiwot.a@yahoo.com', 7, 9400, 282, 1, 'VIP nails & spa client', '2024-12-02 00:00:00'],
    ['cust_abebe_09', 'cmp_gech_01', 'Abebe Wolde', '+251 93 900 1009', null, 10, 3900, 117, 0, 'Prefers early morning slots', '2025-06-25 00:00:00'],
    ['cust_rahel_10', 'cmp_gech_01', 'Rahel Bekele', '+251 92 010 1110', 'rahel.b@gmail.com', 2, 900, 27, 0, null, '2026-07-14 00:00:00'],
    ['cust_markos_11', 'cmp_gech_01', 'Markos Girma', '+251 91 120 1311', null, 6, 1900, 57, 0, 'Haircut + wig trim regular', '2025-04-09 00:00:00'],
    ['cust_tsion_12', 'cmp_gech_01', 'Tsion Ayele', '+251 93 140 1512', 'tsion.a@gmail.com', 1, 400, 12, 0, 'New client - threading', '2026-08-16 00:00:00'],
  ]);

  // 10. VisitSessions — today's queue + recent sample data
  await insertMany(pool, 'visit_sessions', ['id', 'company_id', 'branch_id', 'business_unit_id', 'queue_number', 'customer_id', 'customer_name', 'customer_phone', 'status', 'subtotal_etb', 'discount_etb', 'tax_etb', 'net_total_etb', 'payment_method', 'payment_reference', 'is_paid', 'started_at', 'completed_at', 'notes'], [
    ['vst_g01', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Q-001', 'cust_seble_01', 'Seble Mulugeta', '+251 91 100 2001', 'completed', 4150, 100, 0, 4050, 'telebirr', 'TB-445566', 1, '2026-08-07 09:00:00', '2026-08-07 10:30:00', 'Color + Blowdry combo'],
    ['vst_g02', 'cmp_gech_01', 'br_female_01', 'bu_female_nails', 'Q-002', 'cust_fasika_03', 'Fasika Demissie', '+251 92 300 4003', 'completed', 750, 0, 0, 750, 'cbe_birr', 'CBE-778899', 1, '2026-08-07 10:00:00', '2026-08-07 10:55:00', null],
    ['vst_g03', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Q-003', 'cust_haile_02', 'Haile Gebreselassie', '+251 91 200 3002', 'in_progress', 400, 0, 0, 400, 'cash', null, 0, '2026-08-07 11:00:00', null, 'Haircut'],
    ['vst_g04', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'Q-004', 'cust_tesfaye_04', 'Tesfaye Alemu', '+251 93 400 5004', 'queued', 500, 0, 0, 500, null, null, 0, '2026-08-07 11:30:00', null, 'Haircut + Wig trim'],
    ['vst_g05', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Q-003', 'cust_selam_06', 'Selam Worku', '+251 91 600 7006', 'in_progress', 4000, 0, 0, 4000, null, null, 0, '2026-08-17 10:15:00', null, 'Color treatment'],
    ['vst_g06', 'cmp_gech_01', 'br_female_01', 'bu_female_nails', 'Q-004', 'cust_hiwot_08', 'Hiwot Assefa', '+251 91 800 9008', 'in_progress', 850, 0, 0, 850, null, null, 0, '2026-08-17 10:30:00', null, 'Gel nails'],
    ['vst_g07', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'Q-005', 'cust_rahel_10', 'Rahel Bekele', '+251 92 010 1110', 'queued', 600, 0, 0, 600, null, null, 0, '2026-08-17 11:00:00', null, 'Ponytail style'],
    ['vst_g08', 'cmp_gech_01', 'br_female_01', 'bu_female_skin', 'Q-006', 'cust_tsion_12', 'Tsion Ayele', '+251 93 140 1512', 'queued', 100, 0, 0, 100, null, null, 0, '2026-08-17 11:15:00', null, 'Threading'],
    ['vst_g09', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Q-005', 'cust_dawit_07', 'Dawit Mekonnen', '+251 92 700 8007', 'queued', 400, 0, 0, 400, null, null, 0, '2026-08-17 10:45:00', null, 'Fade haircut'],
    ['vst_g10', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Q-006', 'cust_markos_11', 'Markos Girma', '+251 91 120 1311', 'queued', 100, 0, 0, 100, null, null, 0, '2026-08-17 11:05:00', null, 'Wig trim'],
    ['vst_g11', 'cmp_gech_01', 'br_female_01', 'bu_female_skin', 'Q-007', 'cust_miheret_05', 'Miheret Kassahun', '+251 91 500 6005', 'completed', 3000, 0, 0, 3000, 'telebirr', 'TB-909090', 1, '2026-08-17 09:00:00', '2026-08-17 10:00:00', 'Moroccan bath + massage'],
    ['vst_g12', 'cmp_gech_01', 'br_mens_01', 'bu_mens_hair', 'Q-007', 'cust_abebe_09', 'Abebe Wolde', '+251 93 900 1009', 'completed', 400, 0, 0, 400, 'cash', null, 1, '2026-08-17 09:30:00', '2026-08-17 10:00:00', 'Haircut'],
  ]);

  // 11. VisitSessionServices
  await insertMany(pool, 'visit_session_services', ['id', 'visit_session_id', 'service_id', 'service_name', 'staff_id', 'staff_name', 'price_etb', 'duration_minutes', 'commission_earned_etb', 'status'], [
    ['vss_g01_1', 'vst_g01', 'srv_amh_28', 'ፀጉር ቀለም መቀባት', 'stf_hana_01', 'Hana Abera', 4000, 30, 1000, 'completed'],
    ['vss_g01_2', 'vst_g01', 'srv_amh_01', 'ፀጉር መታጠብ', 'stf_hana_01', 'Hana Abera', 150, 30, 38, 'completed'],
    ['vss_g02_1', 'vst_g02', 'srv_amh_60', 'ጥፍር መተከል', 'stf_alma_03', 'Alma Getahun', 450, 30, 113, 'completed'],
    ['vss_g02_2', 'vst_g02', 'srv_amh_61', 'ሽላክ ጥፍር መቀባት', 'stf_alma_03', 'Alma Getahun', 300, 30, 75, 'completed'],
    ['vss_g03_1', 'vst_g03', 'srv_amh_17', 'ፀጉር መቁረጥ', 'stf_bereket_06', 'Bereket Shimelis', 400, 30, 100, 'in_progress'],
    ['vss_g04_1', 'vst_g04', 'srv_amh_17', 'ፀጉር መቁረጥ', 'stf_bereket_06', 'Bereket Shimelis', 400, 30, 100, 'pending'],
    ['vss_g04_2', 'vst_g04', 'srv_amh_21', 'ዊግ መቁረጥ', 'stf_bereket_06', 'Bereket Shimelis', 100, 30, 25, 'pending'],
    ['vss_g05_1', 'vst_g05', 'srv_amh_28', 'ፀጉር ቀለም መቀባት', 'stf_hana_01', 'Hana Abera', 4000, 30, 1000, 'in_progress'],
    ['vss_g06_1', 'vst_g06', 'srv_amh_62', 'የጥፍር ጄል', 'stf_alma_03', 'Alma Getahun', 850, 30, 213, 'in_progress'],
    ['vss_g07_1', 'vst_g07', 'srv_amh_11', 'ፖኒተር በፀጉር', 'stf_meron_02', 'Meron Tadesse', 600, 30, 150, 'pending'],
    ['vss_g08_1', 'vst_g08', 'srv_amh_72', 'ቅድብ በክር', 'stf_fikir_04', 'Fikir Worku', 100, 30, 25, 'pending'],
    ['vss_g09_1', 'vst_g09', 'srv_amh_17', 'ፀጉር መቁረጥ', 'stf_bereket_06', 'Bereket Shimelis', 400, 30, 100, 'pending'],
    ['vss_g10_1', 'vst_g10', 'srv_amh_21', 'ዊግ መቁረጥ', 'stf_yonatan_07', 'Yonatan Alemayehu', 100, 30, 25, 'pending'],
    ['vss_g11_1', 'vst_g11', 'srv_amh_75', 'ሞሮኮ ኖርማል', 'stf_fikir_04', 'Fikir Worku', 2000, 30, 500, 'completed'],
    ['vss_g11_2', 'vst_g11', 'srv_amh_80', 'ኖርማል ማሣጂ', 'stf_fikir_04', 'Fikir Worku', 1000, 30, 250, 'completed'],
    ['vss_g12_1', 'vst_g12', 'srv_amh_17', 'ፀጉር መቁረጥ', 'stf_bereket_06', 'Bereket Shimelis', 400, 30, 100, 'completed'],
  ]);

  // 12. CommissionRules
  await insertMany(pool, 'commission_rules', ['id', 'company_id', 'target_type', 'target_id', 'target_name', 'type', 'value', 'deduct_product_cost', 'is_active'], [
    ['rule_hana', 'cmp_gech_01', 'staff', 'stf_hana_01', 'Hana Abera (Hairstylist)', 'percentage', 28, 0, 1],
    ['rule_meron', 'cmp_gech_01', 'staff', 'stf_meron_02', 'Meron Tadesse (Hairstylist)', 'percentage', 30, 0, 1],
    ['rule_alma', 'cmp_gech_01', 'staff', 'stf_alma_03', 'Alma Getahun (Nail Tech)', 'percentage', 25, 0, 1],
    ['rule_fikir', 'cmp_gech_01', 'staff', 'stf_fikir_04', 'Fikir Worku (Esthetician)', 'percentage', 30, 0, 1],
    ['rule_bereket', 'cmp_gech_01', 'staff', 'stf_bereket_06', 'Bereket Shimelis (Barber)', 'percentage', 30, 0, 1],
    ['rule_yonatan', 'cmp_gech_01', 'staff', 'stf_yonatan_07', 'Yonatan Alemayehu (Barber)', 'percentage', 28, 0, 1],
    ['rule_nathan', 'cmp_gech_01', 'staff', 'stf_nathan_08', 'Nathan Tesfaye (Esthetician)', 'percentage', 25, 0, 1],
  ]);

  // 13. CommissionLogs
  await insertMany(pool, 'commission_logs', ['id', 'company_id', 'branch_id', 'staff_id', 'staff_name', 'visit_session_id', 'service_name', 'service_price_etb', 'commission_amount_etb', 'rule_applied', 'payout_status', 'created_at'], [
    ['com_g01', 'cmp_gech_01', 'br_female_01', 'stf_hana_01', 'Hana Abera', 'vst_g01', 'ፀጉር ቀለም መቀባት', 4000, 1000, '25% Hairstylist Rule', 'unpaid', '2026-08-07 10:30:00'],
    ['com_g02', 'cmp_gech_01', 'br_female_01', 'stf_hana_01', 'Hana Abera', 'vst_g01', 'ፀጉር መታጠብ', 150, 38, '25% Hairstylist Rule', 'unpaid', '2026-08-07 10:30:00'],
    ['com_g03', 'cmp_gech_01', 'br_female_01', 'stf_alma_03', 'Alma Getahun', 'vst_g02', 'ጥፍር መተከል', 450, 113, '25% Nail Tech Rule', 'paid', '2026-08-07 10:55:00'],
    ['com_g04', 'cmp_gech_01', 'br_female_01', 'stf_alma_03', 'Alma Getahun', 'vst_g02', 'ሽላክ ጥፍር መቀባት', 300, 75, '25% Nail Tech Rule', 'paid', '2026-08-07 10:55:00'],
    ['com_g05', 'cmp_gech_01', 'br_female_01', 'stf_fikir_04', 'Fikir Worku', 'vst_g11', 'ሞሮኮ ኖርማል', 2000, 500, '25% Spa Rule', 'unpaid', '2026-08-17 10:00:00'],
    ['com_g06', 'cmp_gech_01', 'br_female_01', 'stf_fikir_04', 'Fikir Worku', 'vst_g11', 'ኖርማል ማሣጂ', 1000, 250, '25% Spa Rule', 'unpaid', '2026-08-17 10:00:00'],
    ['com_g07', 'cmp_gech_01', 'br_mens_01', 'stf_bereket_06', 'Bereket Shimelis', 'vst_g12', 'ፀጉር መቁረጥ', 400, 100, '25% Barber Rule', 'paid', '2026-08-17 10:00:00'],
  ]);

  // 14. Expenses
  await insertMany(pool, 'expenses', ['id', 'company_id', 'branch_id', 'business_unit_id', 'category', 'amount_etb', 'description', 'payment_method', 'recorded_by', 'date', 'is_recurring', 'recurrence_frequency', 'next_due_date', 'auto_process_trigger'], [
    ['exp_g01', 'cmp_gech_01', 'br_female_01', null, 'rent', 35000, 'Female Salon Monthly Rent - Megersa Condo', 'cbe_birr', 'Liya Gebremedhin', '2026-08-01', 1, 'monthly', '2026-09-01', 1],
    ['exp_g02', 'cmp_gech_01', 'br_mens_01', null, 'rent', 28000, 'Men\'s Grooming Monthly Rent - Piassa Area', 'cbe_birr', 'Samuel Desta', '2026-08-01', 1, 'monthly', '2026-09-01', 1],
    ['exp_g03', 'cmp_gech_01', 'br_female_01', null, 'utilities', 4500, 'Electricity & Water - Female Salon', 'cash', 'Liya Gebremedhin', '2026-08-01', 1, 'monthly', '2026-09-01', 0],
    ['exp_g04', 'cmp_gech_01', 'br_mens_01', null, 'utilities', 3800, 'Electricity & Water - Men\'s Grooming', 'cash', 'Samuel Desta', '2026-08-01', 1, 'monthly', '2026-09-01', 0],
    ['exp_g05', 'cmp_gech_01', 'br_female_01', 'bu_female_hair', 'inventory_purchase', 12000, 'Hair color kits & keratin serum restock', 'telebirr', 'Liya Gebremedhin', '2026-08-03', 0, null, null, 0],
    ['exp_g06', 'cmp_gech_01', 'br_mens_01', 'bu_mens_grooming', 'inventory_purchase', 6500, 'Shaving cream & hot towel wraps restock', 'cash', 'Samuel Desta', '2026-08-10', 0, null, null, 0],
  ]);

  // 15. SmsLogs
  await insertMany(pool, 'sms_logs', ['id', 'company_id', 'recipient_phone', 'message_type', 'content', 'status', 'sent_at'], [
    ['sms_g01', 'cmp_gech_01', '+251 91 100 2001', 'session_receipt', 'Thank you Seble! Your visit is complete. Total 3000 ETB. - Gech Beauty Salon', 'sent', '2026-08-07 10:31:00'],
    ['sms_g02', 'cmp_gech_01', '+251 91 200 3002', 'queue_turn_alert', 'Hello Haile! Your haircut is in progress at Gech Mens. Please wait.', 'sent', '2026-08-07 11:05:00'],
    ['sms_g03', 'cmp_gech_01', '+251 91 600 7006', 'queue_turn_alert', 'Hello Selam! Your turn at Gech Beauty Salon. Please come to the front desk.', 'sent', '2026-08-17 10:15:00'],
    ['sms_g04', 'cmp_gech_01', '+251 92 700 8007', 'queue_turn_alert', 'Hello Dawit! Your turn at Gech Mens. Please wait a few minutes.', 'sent', '2026-08-17 10:45:00'],
    ['sms_g05', 'cmp_gech_01', '+251 91 500 6005', 'session_receipt', 'Thank you Miheret! Your visit is complete. Total 3000 ETB. - Gech Beauty Salon', 'sent', '2026-08-17 10:01:00'],
    ['sms_g06', 'cmp_gech_01', '+251 93 900 1009', 'session_receipt', 'Thank you Abebe! Your visit is complete. Total 400 ETB. - Gech Mens', 'sent', '2026-08-17 10:02:00'],
  ]);

  // 16. AuditLogs
  await insertMany(pool, 'audit_logs', ['id', 'company_id', 'branch_id', 'action_type', 'description', 'performed_by', 'timestamp'], [
    ['aud_g01', 'cmp_gech_01', 'br_female_01', 'inventory_adjustment', 'Restocked Hair Color Kit +10 units', 'Liya Gebremedhin (Admin)', '2026-08-03 09:00:00'],
    ['aud_g02', 'cmp_gech_01', 'br_mens_01', 'commission_change', 'Updated Bereket commission to 30%', 'Samuel Desta (Admin)', '2026-08-01 10:00:00'],
    ['aud_g03', 'cmp_gech_01', 'br_female_01', 'payment_edit', 'Session Q-001 checkout completed - 3000 ETB', 'Liya Gebremedhin (Receptionist)', '2026-08-07 10:31:00'],
    ['aud_g04', 'cmp_gech_01', 'br_female_01', 'payment_edit', 'Session Q-007 checkout completed - 3000 ETB', 'Liya Gebremedhin (Receptionist)', '2026-08-17 10:01:00'],
    ['aud_g05', 'cmp_gech_01', 'br_mens_01', 'payment_edit', 'Session Q-007 checkout completed - 400 ETB', 'Samuel Desta (Receptionist)', '2026-08-17 10:02:00'],
  ]);
}

async function seedUsers(pool: DbPool) {
  await insertMany(
    pool,
    'users',
    ['id', 'company_id', 'name', 'email', 'password_hash', 'role'],
    USERS_SEED.map(([id, companyId, name, email, password, role]) => [id, companyId, name, email, hashPassword(password), role])
  );
  console.log('[seed] created user accounts (owner@gechsalon.et / Owner123!, admin@gechsalon.et / Manager123!, staff / Staff123!).');
}
