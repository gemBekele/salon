import {
  Company,
  Branch,
  BusinessUnit,
  Staff,
  Service,
  Customer,
  VisitSession,
  CommissionLog,
  CommissionRule,
  InventoryItem,
  ExpenseRecord,
  SmsLog,
  SubscriptionPlan,
  ArchitectureDocSection,
} from '../types';

export const mockSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'plan_starter',
    name: 'Single Location Starter',
    maxBranches: 1,
    maxBusinessUnits: 2,
    maxStaff: 10,
    monthlyFeeEtb: 3500,
    features: ['1 Branch', 'Up to 2 Business Units', 'Receptionist POS', 'Basic Reports', 'SMS Receipts'],
  },
  {
    id: 'plan_growth',
    name: 'Multi-Unit Growth',
    maxBranches: 3,
    maxBusinessUnits: 8,
    maxStaff: 35,
    monthlyFeeEtb: 8500,
    features: ['Up to 3 Branches', 'Multi-Unit Scoping', 'Staff Commission Engine', 'Inventory Auto-Deduction', 'Queue Display'],
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise Multi-City Group',
    maxBranches: 15,
    maxBusinessUnits: 50,
    maxStaff: 200,
    monthlyFeeEtb: 19500,
    features: ['Unlimited Branches across Cities', 'SaaS SLA & Audit Logs', 'AI Shift & Revenue Optimizer', 'Custom Commission Rules', 'API & Webhooks'],
  },
];

export const mockCompanies: Company[] = [
  {
    id: 'cmp_glamour_01',
    name: 'Glamour & Serenity Spa Group',
    slug: 'glamour-serenity',
    subscriptionPlanId: 'plan_enterprise',
    status: 'active',
    currency: 'ETB',
    timezone: 'Africa/Addis_Ababa',
    phone: '+251 91 144 8899',
    email: 'info@glamourserenity.et',
    createdAt: '2025-01-15',
  },
  {
    id: 'cmp_royal_barber_02',
    name: 'Royal Grooming & Salon Ltd',
    slug: 'royal-grooming',
    subscriptionPlanId: 'plan_growth',
    status: 'active',
    currency: 'ETB',
    timezone: 'Africa/Addis_Ababa',
    phone: '+251 91 233 4455',
    email: 'admin@royalgrooming.et',
    createdAt: '2025-03-20',
  },
];

export const mockBranches: Branch[] = [
  {
    id: 'br_bole_01',
    companyId: 'cmp_glamour_01',
    name: 'Bole Medhanealem Flagship',
    city: 'Addis Ababa',
    address: 'Cameroon St, Next to Edna Mall, Bole',
    phone: '+251 11 662 1020',
    isMainBranch: true,
    status: 'active',
  },
  {
    id: 'br_kazanchis_02',
    companyId: 'cmp_glamour_01',
    name: 'Kazanchis Executive Center',
    city: 'Addis Ababa',
    address: 'UN Avenue, Near Elilly Hotel',
    phone: '+251 11 551 8820',
    isMainBranch: false,
    status: 'active',
  },
  {
    id: 'br_hawassa_03',
    companyId: 'cmp_glamour_01',
    name: 'Hawassa Lakeside Resort Spa',
    city: 'Hawassa',
    address: 'Lake Drive, Haile Resort Area',
    phone: '+251 46 220 5050',
    isMainBranch: false,
    status: 'active',
  },
];

export const mockBusinessUnits: BusinessUnit[] = [
  {
    id: 'bu_bole_mens',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    type: 'mens_salon',
    name: "Gentlemen's Salon & Grooming",
    code: 'MS-BOL-01',
    status: 'active',
  },
  {
    id: 'bu_bole_womens',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    type: 'womens_salon',
    name: "Ladies Beauty & Hair Lounge",
    code: 'WS-BOL-02',
    status: 'active',
  },
  {
    id: 'bu_bole_spa',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    type: 'spa_center',
    name: 'Royal Moroccan Hammam & Spa',
    code: 'SP-BOL-03',
    status: 'active',
  },
  {
    id: 'bu_kazanchis_massage',
    companyId: 'cmp_glamour_01',
    branchId: 'br_kazanchis_02',
    type: 'massage_center',
    name: 'Executive Wellness & Reflexology',
    code: 'MC-KAZ-01',
    status: 'active',
  },
];

export const mockStaff: Staff[] = [
  {
    id: 'stf_abel_01',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_mens',
    name: 'Abel Tesfaye',
    phone: '+251 91 188 2233',
    email: 'abel.t@glamourserenity.et',
    role: 'barber',
    specialties: ['Fade Cut', 'Hot Towel Shave', 'Beard Shaping'],
    defaultCommissionPercentage: 30,
    status: 'available',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'stf_bethlehem_02',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_spa',
    name: 'Bethlehem Girma',
    phone: '+251 92 334 5566',
    email: 'beth.g@glamourserenity.et',
    role: 'masseuse',
    specialties: ['Deep Tissue Massage', 'Swedish Therapy', 'Aromatherapy'],
    defaultCommissionPercentage: 35,
    status: 'busy',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'stf_selam_03',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_womens',
    name: 'Selamawit Kebede',
    phone: '+251 91 556 7788',
    email: 'selam.k@glamourserenity.et',
    role: 'hairstylist',
    specialties: ['Habesha Braids', 'Hair Coloring', 'Keratin Treatment'],
    defaultCommissionPercentage: 28,
    status: 'available',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'stf_marta_04',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_spa',
    name: 'Marta Haile',
    phone: '+251 91 990 1122',
    email: 'marta.h@glamourserenity.et',
    role: 'esthetician',
    specialties: ['Moroccan Hammam Scrub', 'HydraFacial', 'Pedicure'],
    defaultCommissionPercentage: 30,
    status: 'available',
    avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'stf_dawit_05',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_mens',
    name: 'Dawit Solomon',
    phone: '+251 91 445 6677',
    email: 'dawit.s@glamourserenity.et',
    role: 'receptionist',
    specialties: ['POS Operations', 'Queue Dispatching', 'Customer Care'],
    defaultCommissionPercentage: 0,
    status: 'available',
  },
];

export const mockInventoryItems: InventoryItem[] = [
  {
    id: 'inv_massage_oil',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_spa',
    name: 'Organic Lavender Massage Oil',
    sku: 'OIL-LAV-500',
    unit: 'ml',
    currentStock: 320,
    reorderLevel: 300,
    unitCostEtb: 12,
    lastRestockedAt: '2026-08-01',
  },
  {
    id: 'inv_black_soap',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_spa',
    name: 'Moroccan Beldi Black Soap',
    sku: 'SOP-BLK-250',
    unit: 'pcs',
    currentStock: 18,
    reorderLevel: 10,
    unitCostEtb: 150,
    lastRestockedAt: '2026-07-28',
  },
  {
    id: 'inv_beard_balm',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_mens',
    name: 'Royal Sandalwood Beard Balm',
    sku: 'BLM-SAN-100',
    unit: 'pcs',
    currentStock: 25,
    reorderLevel: 5,
    unitCostEtb: 220,
    lastRestockedAt: '2026-08-02',
  },
  {
    id: 'inv_disposable_towels',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_mens',
    name: 'Premium Spa Towels (Disposable)',
    sku: 'TWL-DSP-100',
    unit: 'pcs',
    currentStock: 140,
    reorderLevel: 50,
    unitCostEtb: 25,
    lastRestockedAt: '2026-08-04',
  },
];

export const mockServices: Service[] = [
  {
    id: 'srv_mens_cut_groom',
    companyId: 'cmp_glamour_01',
    businessUnitId: 'bu_bole_mens',
    name: 'Executive Haircut & Beard Shaping',
    category: 'Hair & Grooming',
    priceEtb: 650,
    durationMinutes: 45,
    commissionType: 'percentage',
    commissionValue: 30,
    requiredInventory: [
      { inventoryItemId: 'inv_beard_balm', quantityUsed: 1 },
      { inventoryItemId: 'inv_disposable_towels', quantityUsed: 1 },
    ],
    isActive: true,
  },
  {
    id: 'srv_moroccan_hammam',
    companyId: 'cmp_glamour_01',
    businessUnitId: 'bu_bole_spa',
    name: 'Royal Moroccan Hammam Scrub',
    category: 'Spa & Bath',
    priceEtb: 1800,
    durationMinutes: 60,
    commissionType: 'percentage',
    commissionValue: 30,
    requiredInventory: [
      { inventoryItemId: 'inv_black_soap', quantityUsed: 1 },
      { inventoryItemId: 'inv_disposable_towels', quantityUsed: 2 },
    ],
    isActive: true,
  },
  {
    id: 'srv_deep_tissue_massage',
    companyId: 'cmp_glamour_01',
    businessUnitId: 'bu_bole_spa',
    name: '60-Min Deep Tissue Therapeutic Massage',
    category: 'Massage Therapy',
    priceEtb: 2200,
    durationMinutes: 60,
    commissionType: 'percentage',
    commissionValue: 35,
    requiredInventory: [{ inventoryItemId: 'inv_massage_oil', quantityUsed: 50 }],
    isActive: true,
  },
  {
    id: 'srv_ladies_blowdry',
    companyId: 'cmp_glamour_01',
    businessUnitId: 'bu_bole_womens',
    name: 'Signature Blowdry & Styling',
    category: 'Haircare',
    priceEtb: 950,
    durationMinutes: 50,
    commissionType: 'percentage',
    commissionValue: 28,
    requiredInventory: [],
    isActive: true,
  },
  {
    id: 'srv_pedicure_gel',
    companyId: 'cmp_glamour_01',
    businessUnitId: 'bu_bole_womens',
    name: 'Deluxe Spa Pedicure with Gel Polish',
    category: 'Nails',
    priceEtb: 850,
    durationMinutes: 45,
    commissionType: 'percentage',
    commissionValue: 30,
    requiredInventory: [],
    isActive: true,
  },
];

export const mockCustomers: Customer[] = [
  {
    id: 'cust_yohannes_01',
    companyId: 'cmp_glamour_01',
    name: 'Yohannes Alemu',
    phone: '+251 91 122 3344',
    email: 'yohannes.a@gmail.com',
    totalVisits: 12,
    totalSpentEtb: 14200,
    loyaltyPoints: 420,
    isVip: true,
    notes: 'Prefers hot towel finish, likes Abel Tesfaye for haircuts.',
    createdAt: '2025-02-10',
  },
  {
    id: 'cust_hiwot_02',
    companyId: 'cmp_glamour_01',
    name: 'Hiwot Tadesse',
    phone: '+251 91 887 6655',
    email: 'hiwot.t@yahoo.com',
    totalVisits: 8,
    totalSpentEtb: 18500,
    loyaltyPoints: 580,
    isVip: true,
    notes: 'Sensitive skin. Prefers Bethlehem for deep tissue massage.',
    createdAt: '2025-03-05',
  },
  {
    id: 'cust_michael_03',
    companyId: 'cmp_glamour_01',
    name: 'Michael Worku',
    phone: '+251 93 445 9900',
    totalVisits: 2,
    totalSpentEtb: 2450,
    loyaltyPoints: 70,
    isVip: false,
    createdAt: '2026-07-15',
  },
];

export const mockVisitSessions: VisitSession[] = [
  {
    id: 'vst_101',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_mens',
    queueNumber: 'Q-101',
    customerId: 'cust_yohannes_01',
    customerName: 'Yohannes Alemu',
    customerPhone: '+251 91 122 3344',
    services: [
      {
        id: 'vss_101_1',
        serviceId: 'srv_mens_cut_groom',
        serviceName: 'Executive Haircut & Beard Shaping',
        staffId: 'stf_abel_01',
        staffName: 'Abel Tesfaye',
        priceEtb: 650,
        durationMinutes: 45,
        commissionEarnedEtb: 195,
        status: 'completed',
      },
      {
        id: 'vss_101_2',
        serviceId: 'srv_deep_tissue_massage',
        serviceName: '60-Min Deep Tissue Therapeutic Massage',
        staffId: 'stf_bethlehem_02',
        staffName: 'Bethlehem Girma',
        priceEtb: 2200,
        durationMinutes: 60,
        commissionEarnedEtb: 770,
        status: 'in_progress',
      },
    ],
    status: 'in_progress',
    subtotalEtb: 2850,
    discountEtb: 150,
    taxEtb: 0,
    netTotalEtb: 2700,
    paymentMethod: 'telebirr',
    paymentReference: 'TB-99882211',
    isPaid: false,
    startedAt: '2026-08-06T10:15:00',
    notes: 'Combined Haircut + Spa Combo Discount Applied',
  },
  {
    id: 'vst_102',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_spa',
    queueNumber: 'Q-102',
    customerId: 'cust_hiwot_02',
    customerName: 'Hiwot Tadesse',
    customerPhone: '+251 91 887 6655',
    services: [
      {
        id: 'vss_102_1',
        serviceId: 'srv_moroccan_hammam',
        serviceName: 'Royal Moroccan Hammam Scrub',
        staffId: 'stf_marta_04',
        staffName: 'Marta Haile',
        priceEtb: 1800,
        durationMinutes: 60,
        commissionEarnedEtb: 540,
        status: 'completed',
      },
    ],
    status: 'completed',
    subtotalEtb: 1800,
    discountEtb: 0,
    taxEtb: 0,
    netTotalEtb: 1800,
    paymentMethod: 'cbe_birr',
    paymentReference: 'CBE-771144',
    isPaid: true,
    startedAt: '2026-08-06T09:30:00',
    completedAt: '2026-08-06T10:35:00',
  },
  {
    id: 'vst_103',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    businessUnitId: 'bu_bole_mens',
    queueNumber: 'Q-103',
    customerId: 'cust_michael_03',
    customerName: 'Michael Worku',
    customerPhone: '+251 93 445 9900',
    services: [
      {
        id: 'vss_103_1',
        serviceId: 'srv_mens_cut_groom',
        serviceName: 'Executive Haircut & Beard Shaping',
        staffId: 'stf_abel_01',
        staffName: 'Abel Tesfaye',
        priceEtb: 650,
        durationMinutes: 45,
        commissionEarnedEtb: 195,
        status: 'pending',
      },
    ],
    status: 'queued',
    subtotalEtb: 650,
    discountEtb: 0,
    taxEtb: 0,
    netTotalEtb: 650,
    isPaid: false,
    startedAt: '2026-08-06T11:00:00',
  },
];

export const mockCommissionRules: CommissionRule[] = [
  {
    id: 'rule_stf_01',
    companyId: 'cmp_glamour_01',
    targetType: 'staff',
    targetId: 'stf_abel_01',
    targetName: 'Abel Tesfaye (Barber)',
    type: 'percentage',
    value: 35,
    isActive: true,
    updatedAt: '2026-02-01',
  },
  {
    id: 'rule_stf_02',
    companyId: 'cmp_glamour_01',
    targetType: 'staff',
    targetId: 'stf_bethlehem_02',
    targetName: 'Bethlehem Girma (Spa)',
    type: 'percentage',
    value: 35,
    isActive: true,
    updatedAt: '2026-02-05',
  },
  {
    id: 'rule_srv_01',
    companyId: 'cmp_glamour_01',
    targetType: 'service',
    targetId: 'srv_deep_tissue_massage',
    targetName: '60-Min Deep Tissue Therapeutic Massage',
    type: 'fixed_amount',
    value: 800,
    isActive: true,
    updatedAt: '2026-02-10',
  },
];

export const mockCommissionLogs: CommissionLog[] = [
  {
    id: 'com_01',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    staffId: 'stf_abel_01',
    staffName: 'Abel Tesfaye',
    visitSessionId: 'vst_101',
    serviceName: 'Executive Haircut & Beard Shaping',
    servicePriceEtb: 650,
    commissionAmountEtb: 195,
    ruleApplied: '30% Barber Standard Rate',
    payoutStatus: 'unpaid',
    createdAt: '2026-08-06T10:15:00',
  },
  {
    id: 'com_02',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    staffId: 'stf_marta_04',
    staffName: 'Marta Haile',
    visitSessionId: 'vst_102',
    serviceName: 'Royal Moroccan Hammam Scrub',
    servicePriceEtb: 1800,
    commissionAmountEtb: 540,
    ruleApplied: '30% Esthetician Rate',
    payoutStatus: 'paid',
    createdAt: '2026-08-06T10:35:00',
  },
  {
    id: 'com_03',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    staffId: 'stf_bethlehem_02',
    staffName: 'Bethlehem Girma',
    visitSessionId: 'vst_101',
    serviceName: '60-Min Deep Tissue Therapeutic Massage',
    servicePriceEtb: 2200,
    commissionAmountEtb: 770,
    ruleApplied: '35% Senior Masseuse Rate',
    payoutStatus: 'payout_requested',
    createdAt: '2026-08-06T10:15:00',
  },
];

export const mockExpenses: ExpenseRecord[] = [
  {
    id: 'exp_01',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    category: 'inventory_purchase',
    amountEtb: 4500,
    description: 'Bulk purchase of Organic Lavender Massage Oil (5L)',
    paymentMethod: 'telebirr',
    recordedBy: 'Dawit Solomon',
    date: '2026-08-02',
    isRecurring: false,
  },
  {
    id: 'exp_02',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    category: 'rent',
    amountEtb: 145000,
    description: 'Bole Medhanealem Flagship Commercial Space Monthly Rent',
    paymentMethod: 'cbe_birr',
    recordedBy: 'Dawit Solomon',
    date: '2026-08-01',
    isRecurring: true,
    recurrenceFrequency: 'monthly',
    nextDueDate: '2026-09-01',
    autoProcessTrigger: true,
  },
  {
    id: 'exp_03',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    category: 'utilities',
    amountEtb: 12800,
    description: 'Bole Flagship Electricity & High-speed Fiber Internet Bill',
    paymentMethod: 'cbe_birr',
    recordedBy: 'Dawit Solomon',
    date: '2026-08-01',
    isRecurring: true,
    recurrenceFrequency: 'monthly',
    nextDueDate: '2026-09-01',
    autoProcessTrigger: true,
  },
];

export const mockAuditLogs = [
  {
    id: 'aud_101',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    actionType: 'inventory_adjustment' as const,
    description: 'Manual Stock Adjustment: Restocked +50 Organic Lavender Massage Oil (5L)',
    performedBy: 'Dawit Solomon (Tenant Admin)',
    timestamp: '2026-08-06T09:30:00',
    details: 'Initial stock reorder threshold override',
    ipAddress: '197.156.102.14',
  },
  {
    id: 'aud_102',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    actionType: 'commission_change' as const,
    description: 'Commission Rule Modified: Set Abel Tesfaye (Barber) to 35%',
    performedBy: 'Dawit Solomon (Tenant Admin)',
    timestamp: '2026-08-06T10:10:00',
    details: 'Increased senior barber commission rate by 5%',
    ipAddress: '197.156.102.14',
  },
  {
    id: 'aud_103',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    actionType: 'payment_edit' as const,
    description: 'Payment Checkout Finalized: Session Q-101 (2700 ETB via Telebirr)',
    performedBy: 'Sara Tekle (Receptionist)',
    timestamp: '2026-08-06T10:16:00',
    details: 'Reference TB-99882211 verified',
    ipAddress: '197.156.102.88',
  },
  {
    id: 'aud_104',
    companyId: 'cmp_glamour_01',
    branchId: 'br_bole_01',
    actionType: 'expense_added' as const,
    description: 'Recurring Expense Triggered: Rent (145,000 ETB) queued for Bole Flagship',
    performedBy: 'System Auto-Trigger',
    timestamp: '2026-08-01T08:00:00',
    details: 'Monthly recurring schedule executed',
    ipAddress: '127.0.0.1',
  },
];

export const mockSmsLogs: SmsLog[] = [
  {
    id: 'sms_01',
    companyId: 'cmp_glamour_01',
    recipientPhone: '+251 91 122 3344',
    messageType: 'session_receipt',
    content: 'Glamour Spa Bole: Thank you Yohannes! Session Q-101 registered. Total: 2700 ETB. Telebirr ref: TB-99882211.',
    status: 'sent',
    sentAt: '2026-08-06T10:16:00',
  },
  {
    id: 'sms_02',
    companyId: 'cmp_glamour_01',
    recipientPhone: '+251 93 445 9900',
    messageType: 'queue_turn_alert',
    content: 'Glamour Salon: Hello Michael, ticket Q-103 is up next at Station 1 (Barber Abel). Please step inside.',
    status: 'sent',
    sentAt: '2026-08-06T11:02:00',
  },
];

export const mockArchitectureSections: ArchitectureDocSection[] = [
  {
    id: 'tenant_isolation',
    title: 'Single-Database Multi-Tenant Isolation & Company Scoping',
    iconName: 'ShieldCheck',
    summary: 'Guarantees strict data segregation across companies using Eloquent Global Scopes, Middleware & Policy checks.',
    contentMarkdown: `### 1. Architectural Strategy
We employ a **Single-Database Shared-Schema Multi-Tenancy** design. Every business table (\`branches\`, \`business_units\`, \`staff\`, \`customers\`, \`visit_sessions\`, \`inventory_items\`, \`commissions\`) contains an indexed mandatory column: \`company_id\` (foreign key to \`companies.id\`).

### 2. Eloquent Trait & Global Scope Implementation
In Laravel 11, the \`CompanyTenantTrait\` automatically binds a global scope to all models. Any query automatically injects \`WHERE company_id = ?\` using the current authenticated context.`,
    codeSnippets: [
      {
        filename: 'app/Models/Traits/CompanyTenantTrait.php',
        language: 'php',
        code: `<?php

namespace App\\Models\\Traits;

use App\\Models\\Scopes\\CompanyTenantScope;
use Illuminate\\Database\\Eloquent\\Model;

trait CompanyTenantTrait
{
    public static function bootCompanyTenantTrait(): void
    {
        static::addGlobalScope(new CompanyTenantScope());

        static::creating(function (Model $model) {
            if (! $model->company_id && session()->has('company_id')) {
                $model->company_id = session('company_id');
            }
        });
    }
}
`,
      },
      {
        filename: 'app/Models/Scopes/CompanyTenantScope.php',
        language: 'php',
        code: `<?php

namespace App\\Models\\Scopes;

use Illuminate\\Database\\Eloquent\\Builder;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Scope;

class CompanyTenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (session()->has('company_id')) {
            $builder->where($model->getTable() . '.company_id', '=', session('company_id'));
        }
    }
}
`,
      },
      {
        filename: 'app/Http/Middleware/EnsureTenantIsolation.php',
        language: 'php',
        code: `<?php

namespace App\\Http\\Middleware;

use Closure;
use Illuminate\\Http\\Request;
use Symfony\\Component\\HttpFoundation\\Response;

class EnsureTenantIsolation
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! $user->company_id) {
            abort(403, 'Unauthorized tenant access attempt detected.');
        }

        // Set session context for global scope
        session(['company_id' => $user->company_id]);

        return $next($request);
    }
}
`,
      },
    ],
  },
  {
    id: 'visit_session_engine',
    title: 'Atomic Visit Session & Staff Multi-Service Commission Engine',
    iconName: 'Workflow',
    summary: 'Coordinates fast receptionist walk-in checkout, staff service splitting, inventory deduction, and SMS dispatcher in a single DB Transaction.',
    contentMarkdown: `### 1. Receptionist Visit Session Workflow
When a customer arrives at the salon/spa, the Receptionist POS creates a \`VisitSession\` record with a sequential Queue number (e.g. Q-104).

### 2. Multi-Service & Staff Assignment
A single visit session can hold multiple distinct services, each performed by a different specialist (e.g., Haircut by Barber Abel + Moroccan Hammam by Esthetician Marta).

### 3. Automatic Inventory Stock Deduction & Commission Splitting
Upon session checkout, Laravel executes a atomic database transaction:
1. Deducts required inventory items (e.g., 50ml massage oil, 1x black soap) from \`inventory_items\` for the branch.
2. Calculates staff commissions based on percentage or fixed rate rules and inserts records into \`commission_logs\`.
3. Dispatches SMS receipt via database queue to cPanel worker.`,
    codeSnippets: [
      {
        filename: 'app/Services/VisitSessionCheckoutService.php',
        language: 'php',
        code: `<?php

namespace App\\Services;

use App\\Models\\VisitSession;
use App\\Models\\InventoryItem;
use App\\Models\\CommissionLog;
use App\\Models\\SmsLog;
use Illuminate\\Support\\Facades\\DB;

class VisitSessionCheckoutService
{
    public function completeCheckout(VisitSession $session, array $paymentData): VisitSession
    {
        return DB::transaction(function () use ($session, $paymentData) {
            // 1. Lock session for atomic update
            $session->lockForUpdate();

            $session->update([
                'status' => 'completed',
                'is_paid' => true,
                'payment_method' => $paymentData['method'],
                'payment_reference' => $paymentData['reference'] ?? null,
                'completed_at' => now(),
            ]);

            // 2. Loop services to calculate staff commissions & deduct stock
            foreach ($session->services as $serviceItem) {
                // Deduct inventory
                foreach ($serviceItem->service->requiredInventory as $req) {
                    InventoryItem::where('id', $req->inventory_item_id)
                        ->decrement('current_stock', $req->quantity_used);
                }

                // Create commission log
                CommissionLog::create([
                    'company_id' => $session->company_id,
                    'branch_id' => $session->branch_id,
                    'staff_id' => $serviceItem->staff_id,
                    'visit_session_id' => $session->id,
                    'service_name' => $serviceItem->service_name,
                    'service_price_etb' => $serviceItem->price_etb,
                    'commission_amount_etb' => $serviceItem->commission_earned_etb,
                    'rule_applied' => "{$serviceItem->staff->default_commission_percentage}% Standard Rate",
                    'payout_status' => 'unpaid',
                ]);
            }

            // 3. Queue SMS receipt
            SmsLog::create([
                'company_id' => $session->company_id,
                'recipient_phone' => $session->customer_phone,
                'message_type' => 'session_receipt',
                'content' => "{$session->company->name}: Thank you {$session->customer_name}! Session {$session->queue_number} complete. Amount: {$session->net_total_etb} ETB.",
                'status' => 'queued',
            ]);

            return $session;
        });
    }
}
`,
      },
    ],
  },
  {
    id: 'cpanel_queue_deployment',
    title: 'cPanel Compatible Queue System & Cron Deployment Architecture',
    iconName: 'Server',
    summary: 'Ensures background queues, SMS dispatchers, and scheduled reports run reliably on cPanel web hosting without Redis dependencies.',
    contentMarkdown: `### 1. cPanel Compatibility Guarantee
To support cPanel hosting without requiring dedicated VPS/Redis daemons:
- **Queue Driver**: Uses \`database\` queue driver (\`jobs\` table).
- **Scheduled Worker**: Executes via standard cPanel Cron Job every minute:

\`\`\`bash
* * * * * cd /home/user/public_html && php artisan schedule:run >> /dev/null 2>&1
\`\`\`

### 2. Kernel Schedule Config (\`app/Console/Kernel.php\`)
The Kernel handles background queue draining without overflowing memory on shared hosts.`,
    codeSnippets: [
      {
        filename: 'app/Console/Kernel.php',
        language: 'php',
        code: `<?php

namespace App\\Console;

use Illuminate\\Console\\Scheduling\\Schedule;
use Illuminate\\Foundation\\Console\\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        // Drain queued SMS and email jobs safely on cPanel
        $schedule->command('queue:work --queue=default --stop-when-empty --time-limit=50')
                 ->everyMinute()
                 ->withoutOverlapping();

        // Daily stock alert digest
        $schedule->command('erp:check-low-stock')->dailyAt('08:00');
    }
}
`,
      },
      {
        filename: '.env.cpanel.example',
        language: 'ini',
        code: `APP_NAME="Salon & Spa Management ERP SaaS"
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://salon.yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cpanel_salon_erp
DB_USERNAME=cpanel_dbuser
DB_PASSWORD=SecurePassword123!

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database

TELEBIRR_MERCHANT_ID=
CBE_BIRR_MERCHANT_ID=
ETHIO_TELECOM_SMS_API_KEY=
`,
      },
    ],
  },
  {
    id: 'rbac_system',
    title: 'Multi-Tenant User Roles & Permissions System (RBAC)',
    iconName: 'ShieldCheck',
    summary: 'Granular Role-Based Access Control supporting SaaS Super Admins, Tenant Salon Owners, Branch Managers, Receptionists, and Staff.',
    contentMarkdown: `### 1. Spatie Laravel-Permission Architecture with Team Scoping
We leverage \`spatie/laravel-permission\` configured for **Teams Multi-Tenancy** (\`permission.teams = true\` with \`company_id\` as team foreign key).

- **Global Roles** (\`Super Admin\`): Have \`company_id = null\` and bypass all tenant permission checks using Laravel Gate \`before()\` callback.
- **Tenant Roles** (\`Salon Owner\`, \`Branch Manager\`, \`Receptionist\`, \`Staff\`): Bound strictly to \`company_id\`.
- **Branch Scope**: Staff and Branch Managers are constrained to assigned branches via \`staff_branch\` pivot table and session-active branch context.`,
    codeSnippets: [
      {
        filename: 'app/Policies/VisitSessionPolicy.php',
        language: 'php',
        code: `<?php

namespace App\\Policies;

use App\\Models\\User;
use App\\Models\\VisitSession;
use Illuminate\\Auth\\Access\\Response;

class VisitSessionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('visits.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('visits.create');
    }

    public function void(User $user, VisitSession $session): Response
    {
        if ($session->is_paid && ! $user->hasPermissionTo('visits.void')) {
            return Response::deny('Only Branch Managers or Salon Owners can void completed/paid visits.');
        }

        return $user->hasPermissionTo('visits.void')
            ? Response::allow()
            : Response::deny('Insufficient privileges to void session.');
    }

    public function discount(User $user, VisitSession $session): bool
    {
        return $user->hasPermissionTo('checkout.apply_discount');
    }

    public function refund(User $user, VisitSession $session): bool
    {
        return $user->hasPermissionTo('checkout.process_refund');
    }

    public function editCompleted(User $user, VisitSession $session): bool
    {
        return $user->hasPermissionTo('visits.edit_completed');
    }
}
`,
      },
      {
        filename: 'app/Providers/AuthServiceProvider.php',
        language: 'php',
        code: `<?php

namespace App\\Providers;

use App\\Models\\User;
use Illuminate\\Foundation\\Support\\Providers\\AuthServiceProvider as ServiceProvider;
use Illuminate\\Support\\Facades\\Gate;

class AuthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->registerPolicies();

        // Implicitly grant 'Super Admin' role all permissions at global level
        Gate::before(function (User $user, string $ability) {
            return $user->hasRole('Super Admin') ? true : null;
        });
    }
}
`,
      },
      {
        filename: 'database/seeders/RolesAndPermissionsSeeder.php',
        language: 'php',
        code: `<?php

namespace Database\\Seeders;

use Illuminate\\Database\\Seeder;
use Spatie\\Permission\\Models\\Role;
use Spatie\\Permission\\Models\\Permission;
use Spatie\\Permission\\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Create Granular Permissions
        $permissions = [
            'tenant.manage_branding', 'tenant.view_dashboard', 'tenant.manage_billing',
            'branches.create', 'branches.edit', 'branches.view_all',
            'users.create', 'users.edit', 'users.delete', 'users.assign_roles',
            'staff.create', 'staff.edit', 'staff.manage_schedules', 'staff.set_commission_rate',
            'customers.create', 'customers.view', 'customers.edit', 'customers.export',
            'appointments.create', 'appointments.reschedule', 'appointments.cancel',
            'visits.create', 'visits.add_service', 'visits.edit_completed', 'visits.void',
            'services.create', 'services.edit', 'services.delete', 'services.set_prices',
            'checkout.process', 'checkout.apply_discount', 'checkout.process_refund',
            'commissions.view_own', 'commissions.view_branch', 'commissions.view_company', 'commissions.approve_payout',
            'inventory.view', 'inventory.adjust_stock', 'inventory.transfer_branch', 'inventory.approve_reorder',
            'expenses.create', 'expenses.approve', 'expenses.view_reports',
            'reports.view_daily', 'reports.view_financial', 'reports.export_csv',
            'notifications.send_sms', 'notifications.view_logs',
            'settings.view', 'settings.edit_company',
            'subscriptions.view', 'subscriptions.upgrade',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        // 2. Global Super Admin Role
        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

        // 3. Tenant Salon Owner Role
        $ownerRole = Role::firstOrCreate(['name' => 'Salon Owner', 'guard_name' => 'web']);
        $ownerRole->givePermissionTo(Permission::all());

        // 4. Branch Manager Role
        $mgrRole = Role::firstOrCreate(['name' => 'Branch Manager', 'guard_name' => 'web']);
        $mgrRole->givePermissionTo([
            'branches.view_all', 'users.create', 'users.edit', 'staff.create', 'staff.edit', 'staff.manage_schedules',
            'customers.create', 'customers.view', 'customers.edit', 'appointments.create', 'appointments.reschedule', 'appointments.cancel',
            'visits.create', 'visits.add_service', 'visits.void', 'checkout.process', 'checkout.apply_discount', 'checkout.process_refund',
            'commissions.view_branch', 'inventory.view', 'inventory.adjust_stock', 'expenses.create', 'expenses.approve',
            'reports.view_daily', 'reports.view_financial', 'reports.export_csv', 'notifications.send_sms', 'settings.view'
        ]);

        // 5. Receptionist Role
        $recRole = Role::firstOrCreate(['name' => 'Receptionist', 'guard_name' => 'web']);
        $recRole->givePermissionTo([
            'customers.create', 'customers.view', 'customers.edit',
            'appointments.create', 'appointments.reschedule', 'appointments.cancel',
            'visits.create', 'visits.add_service', 'checkout.process',
            'inventory.view', 'notifications.send_sms', 'reports.view_daily'
        ]);

        // 6. Staff Role
        $staffRole = Role::firstOrCreate(['name' => 'Staff', 'guard_name' => 'web']);
        $staffRole->givePermissionTo([
            'visits.add_service', 'commissions.view_own', 'inventory.view'
        ]);
    }
}
`,
      },
    ],
  },
  {
    id: 'customer_journey',
    title: 'End-to-End Customer Journey Workflow Engine',
    iconName: 'Workflow',
    summary: 'Detailed operational specification for customer registration, queue generation, multi-service allocation, staff commissions, checkout payments, inventory deduction, and automated SMS notifications.',
    contentMarkdown: `### 1. Complete Step-by-Step Customer Journey Architecture
The customer journey bridges front-desk receptionist operations with back-of-house staff execution and financial ledger dispatching.

#### Step 1: Customer Registration & Identification
- **Walk-in Identification**: Receptionist searches customer database by local phone (\`+251 9...\` or \`09...\`).
- **Duplicate Prevention**: Database unique index on \`[company_id, phone]\` guarantees clean single-profile identity per tenant.
- **Optional Profile Attributes**: Includes Gender, Birthday, Notes, VIP Tags, SMS Consent (\`opt_in_sms = true\`).

#### Step 2: Visit Session Creation & State Machine
- **Session Lifecycle**: \`open\` ➔ \`in_progress\` ➔ \`ready_for_checkout\` ➔ \`completed\` (or \`cancelled\` / \`no_show\`).
- **Reopening Rule**: Completed visits can be reopened strictly within the same calendar day by Branch Managers to correct service errors, which automatically adjusts commission logs.

#### Step 3: Branch & Business Unit Queue Management
- **Queue Ticket Formatting**: Dynamic prefix per Business Unit (e.g. \`BAR-101\` for Barber Shop, \`SPA-202\` for Moroccan Hammam, \`MAS-303\` for Massage Center).
- **Daily Counter Reset**: Database atomic sequence resets daily at midnight (\`Africa/Addis_Ababa\` timezone).

#### Step 4: Multi-Service & Multi-Staff Allocation
- **Accumulated Pending Charges**: Single visit session supports N services.
- **Individual Staff Assignment**: Each service line item is assigned to a specific staff member (\`service_staff.staff_id\`).
- **Granular Status Flow**: Service line item transitions through \`pending\` ➔ \`assigned\` ➔ \`in_progress\` ➔ \`completed\`.

#### Step 5: Final POS Checkout & Multi-Channel Payment
- **Payment Method Flexibility**: Supports Split Payments (e.g., 500 ETB Cash + 1,200 ETB Telebirr).
- **Automated Ledger Execution**: Database atomic transaction seals checkout:
  1. Updates \`visit_sessions.status = 'completed'\`.
  2. Generates immutable \`invoice\` record.
  3. Writes staff \`commission_logs\`.
  4. Deducts consumable stock from \`inventory_items\`.
  5. Queues Ethio Telecom / Telebirr SMS receipt job.`,
    codeSnippets: [
      {
        filename: 'app/Events/VisitSessionCompleted.php',
        language: 'php',
        code: `<?php

namespace App\\Events;

use App\\Models\\VisitSession;
use Illuminate\\Broadcasting\\InteractsWithSockets;
use Illuminate\\Foundation\\Events\\Dispatchable;
use Illuminate\\Queue\\SerializesModels;

class VisitSessionCompleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public VisitSession $visitSession) {}
}
`,
      },
      {
        filename: 'app/Listeners/ProcessPostCheckoutAutomations.php',
        language: 'php',
        code: `<?php

namespace App\\Listeners;

use App\\Events\\VisitSessionCompleted;
use App\\Jobs\\SendSmsReceiptJob;
use App\\Services\\CommissionCalculatorService;
use App\\Services\\InventoryDeductionService;
use Illuminate\\Support\\Facades\\DB;

class ProcessPostCheckoutAutomations
{
    public function __construct(
        protected CommissionCalculatorService $commissionService,
        protected InventoryDeductionService $inventoryService
    ) {}

    public function handle(VisitSessionCompleted $event): void
    {
        $session = $event->visitSession;

        DB::transaction(function () use ($session) {
            // 1. Calculate and record staff commissions
            $this->commissionService->calculateForSession($session);

            // 2. Automatically deduct inventory product consumption
            $this->inventoryService->deductForSession($session);

            // 3. Queue async SMS receipt to customer
            if ($session->customer && $session->customer->opt_in_sms) {
                SendSmsReceiptJob::dispatch($session);
            }
        });
    }
}
`,
      },
    ],
  },
  {
    id: 'multi_branch_architecture',
    title: 'Multi-Branch, Business Unit & Department Hierarchy',
    iconName: 'Building2',
    summary: '4-Tier Organizational hierarchy (Company -> Branch -> Business Unit -> Department -> Staff) supporting independent branch/unit operations alongside centralized owner control.',
    contentMarkdown: `### 1. 4-Tier Organizational Structure & Scope Mapping
The platform organizes tenant businesses into a rigid 4-tier hierarchy that balances operational autonomy for localized teams with consolidated financial visibility for salon owners.

#### Level 1: Company (Tenant Level)
- **Scope**: Platform tenant account bound by \`company_id\`.
- **Responsibilities**: Branding logos, global currency (ETB/USD), subscription plan & limits, company-wide service category taxonomy, consolidated P&L statements, default commission policies.

#### Level 2: Branch (Physical Location)
- **Scope**: Physical geographic site (e.g., Bole Flagship Branch, Kazanchis Executive Branch).
- **Responsibilities**: Operating hours, physical address, local manager assignment, branch-specific service prices/overrides, branch cash drawer balances, shift closures.

#### Level 3: Business Unit (Specialized Salon & Spa Division)
- **Scope**: Operational specialty hub within a branch (e.g., Men's Barber Salon, Women's Hair & Beauty, Moroccan Spa & Hammam, Body Massage Center).
- **Responsibilities**: Dedicated queue ticket generation (\`BAR-101\`, \`SPA-202\`), specialized station equipment, assigned staff, unit-specific inventory stock, distinct receipt header branding.

#### Level 4: Department (Functional Operational Skill Group)
- **Scope**: Skill & operational category within or across business units (e.g., Hair Care, Nail Care, Facial & Skin, Massage Therapy, Front Desk Cashier).
- **Responsibilities**: Categorizing staff skill matrix, organizing service menus, structuring payroll commission percentage rules.`,
    codeSnippets: [
      {
        filename: 'app/Models/Scopes/BranchScope.php',
        language: 'php',
        code: `<?php

namespace App\\Models\\Scopes;

use Illuminate\\Database\\Eloquent\\Builder;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Scope;

class BranchScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // Enforce active branch filter if user is not a global Salon Owner/Super Admin
        if (session()->has('active_branch_id') && ! auth()->user()?->hasRole('Salon Owner')) {
            $builder->where($model->getTable() . '.branch_id', session('active_branch_id'));
        }
    }
}
`,
      },
      {
        filename: 'app/Traits/ScopesBranchData.php',
        language: 'php',
        code: `<?php

namespace App\\Traits;

use App\\Models\\Scopes\\BranchScope;

trait ScopesBranchData
{
    protected static function bootScopesBranchData(): void
    {
        static::addGlobalScope(new BranchScope);

        static::creating(function ($model) {
            if (! $model->branch_id && session()->has('active_branch_id')) {
                $model->branch_id = session('active_branch_id');
            }
        });
    }
}
`,
      },
    ],
  },
  {
    id: 'saas_architecture',
    title: 'Single-Database Multi-Tenant SaaS Architecture',
    iconName: 'Server',
    summary: 'Single-database multi-tenancy model enforced via Eloquent company_id scopes, subscription plan feature gating, account suspension lifecycles, and audit-logged Super Admin impersonation.',
    contentMarkdown: `### 1. Single-Database Multi-Tenant Identification Engine
Every tenant-owned record strictly contains \`company_id\`. On authenticated HTTP requests, \`EnsureTenantContext\` middleware resolves the active tenant, setting global context and enforcing \`CompanyScope\`.

#### Tenant Scoping Categorization
- **Global Tables** (Shared Platform Data): \`plans\`, \`plan_features\`, \`global_settings\`, \`audit_logs\` (Super Admin).
- **Tenant-Owned Tables** (\`company_id\` indexed): \`companies\`, \`subscriptions\`, \`branches\`, \`business_units\`, \`departments\`, \`users\`, \`customers\`, \`services\`, \`staff\`, \`visit_sessions\`, \`invoices\`, \`payments\`, \`commissions\`, \`inventory_items\`, \`expenses\`.
- **Branch-Owned Tables** (\`company_id\` + \`branch_id\` composite indexed): \`staff_branch\`, \`stock_transactions\`, \`shift_closures\`, \`sms_logs\`.

#### 2. Subscription System & Feature Limits
- **Plan Tiers**: Basic (1 Branch, 3 Staff), Professional (3 Branches, 15 Staff, SMS & Commissions), Enterprise (Unlimited Branches, Custom Rules, Dedicated Support).
- **Plan Limits Enforced**: Max Branches, Max Staff, Max Monthly SMS Credits, Inventory Module Access, TV Queue Display Access.
- **Suspension Lifecycle**: \`trialing\` ➔ \`active\` ➔ \`past_due\` (3-day grace period) ➔ \`suspended\` (Read-only mode for 30 days) ➔ \`archived\`.`,
    codeSnippets: [
      {
        filename: 'app/Http/Middleware/EnsureTenantContext.php',
        language: 'php',
        code: `<?php

namespace App\\Http\\Middleware;

use Closure;
use Illuminate\\Http\\Request;
use Symfony\\Component\\HttpFoundation\\Response;

class EnsureTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        // Global Super Admins bypass tenant restriction
        if ($user->hasRole('Super Admin')) {
            return $next($request);
        }

        if (! $user->company_id || ! $user->company->is_active) {
            return response()->json([
                'error' => 'Tenant account suspended or inactive. Please contact support.'
            ], 403);
        }

        // Bind company_id context globally in app container
        app()->singleton('tenant_id', fn() => $user->company_id);

        return $next($request);
    }
}
`,
      },
      {
        filename: 'app/Models/Scopes/CompanyScope.php',
        language: 'php',
        code: `<?php

namespace App\\Models\\Scopes;

use Illuminate\\Database\\Eloquent\\Builder;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Scope;

class CompanyScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (app()->bound('tenant_id')) {
            $builder->where($model->getTable() . '.company_id', app('tenant_id'));
        }
    }
}
`,
      },
      {
        filename: 'app/Http/Controllers/SuperAdmin/ImpersonationController.php',
        language: 'php',
        code: `<?php

namespace App\\Http\\Controllers\\SuperAdmin;

use App\\Http\\Controllers\\Controller;
use App\\Models\\AuditLog;
use App\\Models\\User;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Auth;

class ImpersonationController extends Controller
{
    public function impersonate(Request $request, User $targetUser)
    {
        $admin = Auth::user();

        // 1. Audit Log Impersonation Start
        AuditLog::create([
            'company_id' => $targetUser->company_id,
            'user_id' => $admin->id,
            'action' => 'SUPERADMIN_IMPERSONATION_START',
            'details' => json_encode([
                'admin_email' => $admin->email,
                'target_user_id' => $targetUser->id,
                'target_email' => $targetUser->email,
                'ip_address' => $request->ip(),
            ]),
        ]);

        // 2. Store original admin ID in session
        session(['impersonator_id' => $admin->id]);

        // 3. Login as target user
        Auth::login($targetUser);

        return redirect()->route('dashboard')->with('info', "Now impersonating {$targetUser->name}");
    }
}
`,
      },
    ],
  },
  {
    id: 'ui_ux_system',
    title: 'Touch-First UI/UX System & Wireframe Blueprint',
    iconName: 'Layout',
    summary: 'Touch-optimized UI/UX design system tailored for non-technical salon receptionists and busy salon environments, featuring ASCII wireframes, responsive breakpoints, and Livewire component specs.',
    contentMarkdown: `### 1. Touch-First Design Principles for High-Traffic Salons
The UI system prioritizes speed, high visual contrast, and low cognitive load for busy reception desks and non-technical staff operating on touch tablets (iPad / Android POS) or desktop monitors.

#### Core UX Directives:
- **Large Tap Targets**: Minimum 48px × 48px touch controls for all primary action buttons.
- **Search-First Customer Identification**: Auto-focus phone number lookup bar on reception screen load (\`+251 9...\`).
- **Touch Card Selection**: Service and staff pickers use visual card tiles rather than dense drop-down selects.
- **Color-Coded Status Tokens**: Visual queue state pills (Green = Completed, Amber = In Progress, Blue = Ready for Checkout, Slate = Pending Queue).

### 2. Comprehensive Screen Inventory (21 Core Views)
1. **Login & Branch Selector** (\`/login\`)
2. **Super Admin Platform Overview** (\`/admin/dashboard\`)
3. **Salon Owner Executive Dashboard** (\`/owner/dashboard\`)
4. **Branch Manager Operational Dashboard** (\`/manager/dashboard\`)
5. **Front Desk Receptionist Hub** (\`/reception/dashboard\`)
6. **Staff Provider Personal Portal** (\`/staff/portal\`)
7. **Customer Directory** (\`/customers\`)
8. **Customer 360 Profile** (\`/customers/{id}\`)
9. **New Visit Session Wizard** (\`/visits/create\`)
10. **Active Visit Board** (\`/visits/board\`)
11. **Appointment Scheduling Calendar** (\`/appointments/calendar\`)
12. **POS Checkout Summary** (\`/checkout/{visit_id}\`)
13. **Multi-Channel Payment Terminal** (\`/payments/{visit_id}\`)
14. **Service Catalog Matrix** (\`/services\`)
15. **Staff Directory & Roster** (\`/staff\`)
16. **Inventory & Stock Operations** (\`/inventory\`)
17. **Consolidated Financial Reports** (\`/reports\`)
18. **Branch & Business Unit Settings** (\`/settings\`)
19. **SaaS Subscription & Billing** (\`/subscription\`)
20. **SMS Logs & Telebirr Outbox** (\`/sms-logs\`)
21. **TV Waiting Room Queue Display** (\`/queue-display/tv\`)`,
    codeSnippets: [
      {
        filename: 'resources/views/livewire/receptionist-pos-hub.blade.php',
        language: 'blade',
        code: `<div class="grid grid-cols-12 gap-4 h-screen bg-[#f5f5f0] p-4 font-sans text-[#2d2d2a]">
    <!-- Left Panel: Search & Customer Queue (4 Cols) -->
    <div class="col-span-4 bg-white rounded-3xl border border-[#e5e5d1] p-4 flex flex-col space-y-4 shadow-sm">
        <div class="space-y-2">
            <label class="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">Search Customer by Phone</label>
            <div class="relative">
                <input type="text" wire:model.live.debounce.300ms="searchPhone" 
                       placeholder="Enter phone: 0911..." 
                       class="w-full h-12 pl-10 pr-4 text-base rounded-2xl border border-[#e5e5d1] bg-[#f5f5f0] focus:ring-2 focus:ring-[#5A5A40]" autofocus />
                <svg class="w-5 h-5 absolute left-3 top-3.5 text-[#737366]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
        </div>

        <button wire:click="openNewVisitModal" class="w-full h-14 bg-[#5A5A40] hover:bg-[#4a4a34] text-white font-bold rounded-2xl text-base shadow-md flex items-center justify-center space-x-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>+ Create New Walk-in Visit</span>
        </button>

        <!-- Queue Status Board -->
        <div class="flex-1 overflow-y-auto space-y-2">
            <h4 class="text-xs font-bold text-[#737366] uppercase">Today's Waiting Queue ({{ count($waitingQueue) }})</h4>
            @foreach($waitingQueue as $ticket)
                <div wire:click="selectVisit({{ $ticket->id }})" class="p-3 bg-[#f5f5f0] rounded-2xl border border-[#e5e5d1] hover:border-[#5A5A40] cursor-pointer transition">
                    <div class="flex justify-between items-center">
                        <span class="font-mono font-bold text-base text-[#2d2d2a]">{{ $ticket->queue_number }}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">{{ $ticket->status }}</span>
                    </div>
                    <div class="text-sm font-semibold mt-1">{{ $ticket->customer->name }}</div>
                </div>
            @endforeach
        </div>
    </div>

    <!-- Center & Right Panel: Active Service Details & Checkout Total (8 Cols) -->
    <div class="col-span-8 bg-white rounded-3xl border border-[#e5e5d1] p-6 flex flex-col justify-between shadow-sm">
        @if($selectedVisit)
            <div class="space-y-4">
                <div class="flex justify-between items-center border-b border-[#e5e5d1] pb-4">
                    <div>
                        <h2 class="text-xl font-serif font-bold text-[#2d2d2a]">{{ $selectedVisit->customer->name }}</h2>
                        <span class="text-xs text-[#737366]">Ticket: {{ $selectedVisit->queue_number }} • BU: {{ $selectedVisit->businessUnit->name }}</span>
                    </div>
                    <span class="text-2xl font-mono font-bold text-[#5A5A40]">{{ number_format($selectedVisit->running_total, 2) }} ETB</span>
                </div>

                <!-- Service List -->
                <div class="space-y-2">
                    <h4 class="text-xs font-bold text-[#737366] uppercase">Assigned Services</h4>
                    @foreach($selectedVisit->services as $service)
                        <div class="flex justify-between items-center p-3 rounded-2xl bg-[#f5f5f0] border border-[#e5e5d1]">
                            <div>
                                <div class="font-bold text-sm">{{ $service->service_name }}</div>
                                <div class="text-xs text-[#737366]">Staff: {{ $service->staff->name ?? 'Unassigned' }}</div>
                            </div>
                            <span class="font-mono font-bold text-sm">{{ number_format($service->price, 2) }} ETB</span>
                        </div>
                    @endforeach
                </div>
            </div>

            <!-- Bottom Quick Checkout Bar -->
            <div class="pt-4 border-t border-[#e5e5d1] flex space-x-3">
                <button wire:click="openAddServiceModal" class="flex-1 h-14 bg-slate-100 hover:bg-slate-200 text-[#2d2d2a] font-bold rounded-2xl text-base border border-[#e5e5d1]">
                    + Add Service
                </button>
                <button wire:click="proceedToCheckout({{ $selectedVisit->id }})" class="flex-1 h-14 bg-[#2d2d2a] hover:bg-[#1a1a18] text-white font-bold rounded-2xl text-base shadow-lg">
                    Proceed to Checkout →
                </button>
            </div>
        @else
            <div class="h-full flex flex-col items-center justify-center text-center text-[#737366]">
                <svg class="w-16 h-16 text-[#e5e5d1] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg>
                <p class="text-base font-semibold">Select a Visit Ticket from the Queue or Search Customer</p>
            </div>
        @endif
    </div>
</div>
`,
      },
    ],
  },
  {
    id: 'reports_analytics',
    title: 'Reports & Analytics Module Architecture',
    iconName: 'BarChart3',
    summary: 'Comprehensive multi-tenant reporting & analytics system featuring daily, weekly, monthly, staff, service, financial, customer, and inventory reports with composite SQL indexing, caching, and CSV/PDF export pipelines.',
    contentMarkdown: `### 1. Multi-Tenant Role-Scoped Reporting Hierarchy
Reports strictly adhere to multi-tenant security scopes, ensuring Salon Owners view consolidated multi-branch analytics while Branch Managers and Receptionists access localized operational metrics.

#### Scope-Driven Authorization Matrix:
- **Salon Owner**: Consolidated company-wide P&L, multi-branch revenue comparison, total commission liabilities, global inventory valuation.
- **Branch Manager**: Assigned branch sales, staff commission logs, branch expense logs, local stock levels, daily cash shift reconciliation.
- **Receptionist**: Active branch daily sales summary, walk-in vs appointment counts, payment method breakdown (Telebirr/CBE/Cash), pending visits.
- **Staff / Provider**: Individual service counts, personal commission ledger, client retention rate, personal service duration averages.

### 2. Comprehensive Report Catalog (9 Core Categories)

#### Category 1: Daily Operational Reports
- **Metrics**: Total Sales (Gross & Net), Total Customers Served, Visit Count, Service Count, Walk-In vs Appointment Ratio, Average Service Duration (Mins), Average Invoice Value (ETB), Payment Method Breakdown (Telebirr, CBE, Cash, Card), Outstanding Unpaid Visits, Cancelled Services, Discounts Applied.

#### Category 2: Weekly Management Performance Reports
- **Metrics**: Revenue Trend by Day (Mon-Sun), Revenue by Branch, Revenue by Business Unit (Barber Shop vs Spa vs Hammam), Commission Accrued, Operating Expenses Summary, Top 10 High-Margin Services, Staff Utilization Rate (Active Service Hours / Total Shift Hours).

#### Category 3: Monthly Executive Financial Reports
- **Metrics**: Net Profit Margin (Gross Revenue - Commissions - Expenses - Stock Cost), Revenue vs Expense Variance, Branch-by-Branch Comparative Matrix, Total Staff Commission Payout Liability, Product Stock Consumption Valuation, New Customer Acquisition & Repeat Retention Rate.

#### Category 4: Yearly Strategic Growth Reports
- **Metrics**: Year-over-Year (YoY) Revenue Growth, Seasonal Peak Performance Trends (Ethiopian Holidays / Wedding Season), Long-term Customer Retention Cohorts, Staff Turnover & Revenue Contribution, 12-Month Expense Trend Analysis.

#### Category 5: Staff Productivity & Payroll Reports
- **Metrics**: Total Completed Services, Total Revenue Generated, Base vs Variable Commission Earned, Average Service Execution Speed vs Standard Duration, No-Show & Cancellation Impact per Staff Member.

#### Category 6: Service & Category Performance Reports
- **Metrics**: Service Revenue Ranking, Service Volume Ranking, Low-Performing Under-Utilized Services, Category Margin Comparison, Average Consumable Inventory Cost per Service.

#### Category 7: Financial Audit & Cash Flow Reports
- **Metrics**: Cash Register Reconciliation, Digital Payment Ledger (Telebirr Txn IDs, CBE Ref Numbers), Outstanding Accounts Receivable, Refund & Void Audit Trail, Commission Settlement Disbursement History.

#### Category 8: Customer Intelligence & Loyalty Reports
- **Metrics**: New vs Returning Customer Ratio, Customer Lifetime Value (LTV), Top Spenders Ranking, Inactive Customers (No visit > 60 Days), Monthly Birthday Calendar, SMS Campaign Click-Through Rate.

#### Category 9: Inventory & Stock Consumption Reports
- **Metrics**: Real-Time Stock Valuation, Reorder Threshold Low-Stock Alerts, Stock Movement Audit (In / Out / Waste / Transfer), Service Consumption Deductions, Inter-Branch Transfer History.`,
    codeSnippets: [
      {
        filename: 'app/Services/Reports/DailyBranchSalesReportService.php',
        language: 'php',
        code: `<?php

namespace App\\Services\\Reports;

use App\\Models\\Invoice;
use App\\Models\\VisitSession;
use Illuminate\\Support\\Carbon;
use Illuminate\\Support\\Facades\\DB;

class DailyBranchSalesReportService
{
    public function generate(int $companyId, int $branchId, string $date)
    {
        $startDate = Carbon::parse($date, 'Africa/Addis_Ababa')->startOfDay();
        $endDate = Carbon::parse($date, 'Africa/Addis_Ababa')->endOfDay();

        // Single optimized composite-indexed query
        return DB::table('invoices')
            ->where('company_id', $companyId)
            ->where('branch_id', $branchId)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('
                COUNT(id) as total_invoices,
                SUM(gross_amount) as total_gross,
                SUM(discount_amount) as total_discounts,
                SUM(tax_amount) as total_tax,
                SUM(net_amount) as total_net,
                AVG(net_amount) as avg_invoice_value
            ')
            ->first();
    }
}
`,
      },
      {
        filename: 'database/migrations/2026_08_06_create_composite_report_indexes.php',
        language: 'php',
        code: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // High-performance reporting indexes
        Schema::table('invoices', function (Blueprint $table) {
            $table->index(['company_id', 'branch_id', 'status', 'created_at'], 'idx_invoices_report_composite');
        });

        Schema::table('visit_sessions', function (Blueprint $table) {
            $table->index(['company_id', 'branch_id', 'status', 'created_at'], 'idx_visits_report_composite');
        });

        Schema::table('commission_logs', function (Blueprint $table) {
            $table->index(['company_id', 'staff_id', 'status', 'created_at'], 'idx_commissions_report_composite');
        });
    }
};
`,
      },
    ],
  },
  {
    id: 'staff_commission_system',
    title: 'Staff Commission & Payroll Calculation Engine',
    iconName: 'DollarSign',
    summary: 'Comprehensive multi-tenant commission rule engine supporting percentage, fixed amount, tiered brackets, product-deducted net calculations, settlement workflows, and refund clawback adjustments.',
    contentMarkdown: `### 1. Flexible Commission Rule Engine & Scopes
The platform supports multi-tiered commission calculation rules configured at Company, Branch, Business Unit, Service, Role, or individual Staff levels with strict precedence rules.

#### Rule Types & Calculation Logic:
- **Percentage of Service Price**: Standard % (e.g., Hair Cut @ 300 ETB with 30% rule = 90 ETB commission).
- **Fixed Amount per Service**: Flat cash amount (e.g., 50 ETB per Beard Grooming treatment).
- **Tiered Volume Commission**: Tiered percentage based on monthly individual revenue thresholds (e.g., 0 - 20,000 ETB = 25%, 20,001 - 50,000 ETB = 30%, > 50,000 ETB = 35%).
- **Product-Deducted Net Calculation**: Deducts consumable inventory costs before applying commission percentage (Net Base = Service Price - Consumable Product Cost).
- **Service & Staff Specific Overrides**: High-skill senior stylists receive specific percentage overrides on specialty treatments.

### 2. Trigger Conditions & Workflow Lifecycle
- **Trigger Timing Configuration**: Configurable per company settings:
  1. \`on_service_completed\`: Accrues when provider marks service finished in station queue.
  2. \`on_checkout\`: Accrues when receptionist generates visit invoice at POS desk.
  3. \`on_payment_received\` (Default): Accrues strictly upon confirmed payment (Cash, Telebirr, CBE).
- **Settlement Lifecycle States**: \`pending\` ➔ \`approved\` (by Manager) ➔ \`paid\` (Disbursed via Payroll) or \`disputed\`.

### 3. Edge Cases & Reversal Protocols
- **Service Cancellation / Refund**: If an invoice is refunded after commission is calculated, the system creates a \`commission_adjustments\` record with a negative amount (\`clawback\`), adjusting the staff member's next settlement cycle.
- **Rule Changes**: Commission calculations use the rule snapshot active at the time of service execution to preserve historical accuracy.
- **Idempotency Guarantee**: Unique database composite index on \`[visit_service_id, staff_id]\` prevents duplicate commission log creation.`,
    codeSnippets: [
      {
        filename: 'app/Services/CommissionCalculatorService.php',
        language: 'php',
        code: `<?php

namespace App\\Services;

use App\\Models\\CommissionLog;
use App\\Models\\CommissionRule;
use App\\Models\\VisitService;
use Illuminate\\Support\\Facades\\DB;

class CommissionCalculatorService
{
    public function calculateForService(VisitService $service): ?CommissionLog
    {
        if (!$service->staff_id || $service->status !== 'completed') {
            return null;
        }

        // Idempotency check: prevent duplicate commission creation
        $existingLog = CommissionLog::where('visit_service_id', $service->id)
            ->where('staff_id', $service->staff_id)
            ->first();

        if ($existingLog) {
            return $existingLog;
        }

        // 1. Resolve active rule by precedence: Staff > Service > Business Unit > Global
        $rule = CommissionRule::resolveRule(
            $service->company_id,
            $service->branch_id,
            $service->business_unit_id,
            $service->service_id,
            $service->staff_id
        );

        if (!$rule) {
            return null;
        }

        // 2. Compute base calculation amount (deducting product cost if enabled)
        $baseAmount = $service->price;
        if ($rule->deduct_product_cost && $service->consumable_cost > 0) {
            $baseAmount = max(0, $service->price - $service->consumable_cost);
        }

        // 3. Calculate commission amount
        $commissionAmount = 0;
        if ($rule->type === 'percentage') {
            $commissionAmount = ($baseAmount * $rule->value) / 100;
        } elseif ($rule->type === 'fixed') {
            $commissionAmount = $rule->value;
        }

        // 4. Record immutable commission log
        return CommissionLog::create([
            'company_id' => $service->company_id,
            'branch_id' => $service->branch_id,
            'business_unit_id' => $service->business_unit_id,
            'visit_id' => $service->visit_id,
            'visit_service_id' => $service->id,
            'service_id' => $service->service_id,
            'staff_id' => $service->staff_id,
            'rule_id' => $rule->id,
            'base_amount' => $baseAmount,
            'commission_amount' => $commissionAmount,
            'status' => 'pending',
            'calculated_at' => now(),
        ]);
    }
}
`,
      },
      {
        filename: 'database/migrations/2026_08_06_create_commission_tables.php',
        language: 'php',
        code: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commission_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->foreignId('branch_id')->nullable()->constrained();
            $table->foreignId('business_unit_id')->nullable()->constrained();
            $table->foreignId('service_id')->nullable()->constrained();
            $table->foreignId('staff_id')->nullable()->constrained();
            $table->enum('type', ['percentage', 'fixed', 'tiered']);
            $table->decimal('value', 10, 2);
            $table->boolean('deduct_product_cost')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('commission_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('business_unit_id')->constrained();
            $table->foreignId('visit_id')->constrained();
            $table->foreignId('visit_service_id')->constrained();
            $table->foreignId('service_id')->constrained();
            $table->foreignId('staff_id')->constrained();
            $table->foreignId('rule_id')->nullable()->constrained('commission_rules');
            $table->decimal('base_amount', 10, 2);
            $table->decimal('commission_amount', 10, 2);
            $table->enum('status', ['pending', 'approved', 'paid', 'voided'])->default('pending');
            $table->foreignId('settlement_id')->nullable();
            $table->timestamp('calculated_at');
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['visit_service_id', 'staff_id'], 'unique_visit_service_staff_commission');
        });
    }
};
`,
      },
    ],
  },
  {
    id: 'inventory_management_system',
    title: 'Service Consumable & Multi-Branch Inventory System',
    iconName: 'Package',
    summary: 'Automated service recipe (BOM) product deduction engine, multi-branch stock tracking, inter-branch transfers, weighted average costing, and stock audit ledger.',
    contentMarkdown: `### 1. Multi-Branch Inventory & Recipe Structure
The inventory engine links salon services directly to physical consumable items (Bill of Materials / Recipes) and automatically tracks stock levels per branch and warehouse location.

#### Example Scenario:
- **Service**: Hair Coloring Treatment (Price: 1,200 ETB)
- **Consumables Recipe (BOM)**:
  1. *L'Oréal Hair Color Dye*: 60 ml (Cost: 180 ETB)
  2. *Developer 20 Vol*: 90 ml (Cost: 45 ETB)
  3. *Nitrile Protective Gloves*: 1 Pair (Cost: 15 ETB)
- **Automated Deduction**: When Hair Coloring is completed at POS or provider station, stock levels for Dye, Developer, and Gloves are reduced by exact quantities with immutable ledger entries.

### 2. Automatic Deduction & Reversal Flow
- **Trigger Policy**: Deduction triggers automatically on \`service_completed\` or \`visit_checkout\` based on company policy setting.
- **Negative Stock Policy**: Supports configurable behavior (\`allow_with_warning\` vs \`block_completion\`).
- **Reversal Protocol**: Cancelling or refunding a completed service generates a compensating \`service_consumption_reversal\` stock transaction, restoring exact physical balances.

### 3. Inter-Branch Transfers & Valuation
- **Weighted Average Costing (WAC)**: Automatically recalculated on every stock purchase/receipt.
- **Multi-Branch Stock Allocation**: Branch-specific quantity on hand and bin locations.
- **Inter-Branch Transfers**: Internal chain of custody workflow (\`draft\` ➔ \`shipped\` ➔ \`received\`).`,
    codeSnippets: [
      {
        filename: 'app/Services/InventoryDeductionService.php',
        language: 'php',
        code: `<?php

namespace App\\Services;

use App\\Models\\VisitService;
use App\\Models\\StockLevel;
use App\\Models\\StockTransaction;
use App\\Models\\ServiceInventoryRecipe;
use Illuminate\\Support\\Facades\\DB;
use Exception;

class InventoryDeductionService
{
    /**
     * Deduct consumable product inventory upon service completion.
     */
    public function deductForCompletedService(VisitService $visitService, string $userId): void
    {
        DB::transaction(function () use ($visitService, $userId) {
            // Retrieve recipe (Bill of Materials) for this service
            $recipes = ServiceInventoryRecipe::where('service_id', $visitService->service_id)
                ->where('is_active', true)
                ->get();

            foreach ($recipes as $recipe) {
                $item = $recipe->inventoryItem;
                $quantityToDeduct = $recipe->quantity_consumed;

                // Lock stock level row for atomic balance update
                $stockLevel = StockLevel::where('branch_id', $visitService->branch_id)
                    ->where('inventory_item_id', $recipe->inventory_item_id)
                    ->lockForUpdate()
                    ->first();

                if (!$stockLevel) {
                    $stockLevel = StockLevel::create([
                        'company_id' => $visitService->company_id,
                        'branch_id' => $visitService->branch_id,
                        'inventory_item_id' => $recipe->inventory_item_id,
                        'quantity_on_hand' => 0,
                        'reorder_level' => $item->reorder_level ?? 10,
                    ]);
                }

                $previousQty = $stockLevel->quantity_on_hand;
                $newQty = $previousQty - $quantityToDeduct;

                // Update physical balance
                $stockLevel->update(['quantity_on_hand' => $newQty]);

                // Record immutable stock movement transaction
                StockTransaction::create([
                    'company_id' => $visitService->company_id,
                    'branch_id' => $visitService->branch_id,
                    'inventory_item_id' => $recipe->inventory_item_id,
                    'visit_service_id' => $visitService->id,
                    'type' => 'service_consumption',
                    'quantity_change' => -$quantityToDeduct,
                    'balance_after' => $newQty,
                    'unit_cost_etb' => $item->cost_price_etb,
                    'total_cost_etb' => $item->cost_price_etb * $quantityToDeduct,
                    'reference_type' => 'visit_service',
                    'reference_id' => $visitService->id,
                    'created_by' => $userId,
                ]);
            }
        });
    }
}
`,
      },
      {
        filename: 'database/migrations/2026_08_06_create_inventory_tables.php',
        language: 'php',
        code: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->string('sku')->unique();
            $table->string('name');
            $table->string('category');
            $table->string('unit_of_measure'); // e.g. ml, grams, pcs, pair
            $table->decimal('cost_price_etb', 10, 2);
            $table->decimal('retail_price_etb', 10, 2)->nullable();
            $table->integer('reorder_level')->default(10);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('inventory_item_service', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_item_id')->constrained();
            $table->decimal('quantity_consumed', 10, 2);
            $table->string('unit_of_measure');
            $table->boolean('is_mandatory')->default(true);
            $table->timestamps();
        });

        Schema::create('stock_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('inventory_item_id')->constrained();
            $table->decimal('quantity_on_hand', 10, 2)->default(0);
            $table->integer('reorder_level')->default(10);
            $table->timestamps();

            $table->unique(['branch_id', 'inventory_item_id'], 'unique_branch_item_stock');
        });

        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('inventory_item_id')->constrained();
            $table->foreignId('visit_service_id')->nullable();
            $table->enum('type', [
                'purchase_in', 'adjustment_in', 'adjustment_out', 
                'service_consumption', 'transfer_in', 'transfer_out', 
                'return_supplier', 'damage_loss', 'opening_stock'
            ]);
            $table->decimal('quantity_change', 10, 2);
            $table->decimal('balance_after', 10, 2);
            $table->decimal('unit_cost_etb', 10, 2);
            $table->decimal('total_cost_etb', 10, 2);
            $table->string('reference_type')->nullable();
            $table->string('reference_id')->nullable();
            $table->foreignId('created_by')->nullable();
            $table->timestamps();
        });
    }
};
`,
      },
    ],
  },
  {
    id: 'appointment_queue_tv_system',
    title: 'Appointment Booking, Queue & Waiting Area TV Display System',
    iconName: 'Tv',
    summary: 'Real-time multi-tenant appointment scheduling, walk-in queue management, skill-based staff dispatching, automated customer SMS alerts, and Livewire TV Display display screens.',
    contentMarkdown: `### 1. Appointment Booking & Queue Integration Workflow
The system unifies scheduled appointments and walk-in salon visitors into a single prioritized queue per business unit (Barber, Spa, Nails, Hair).

#### Booking Lifecycle:
\`scheduled\` ➔ \`confirmed\` ➔ \`arrived (queued)\` ➔ \`in_progress (called)\` ➔ \`completed\` ➔ \`checked_out\`

- **Walk-in Entry**: Instantly assigned next available queue token (e.g. \`A105\` for Barber, \`S204\` for Spa).
- **Appointment Prioritization**: Scheduled appointments receive dynamic priority boost upon arrival to ensure zero wait times over walk-ins.

### 2. Waiting Area TV Display Specification
Designed for 1080p / 4K smart TVs and wall mounts:
- **NOW SERVING Section**: High-contrast, large-font typography displaying Queue #, Service, Room / Chair #, and Staff Name.
- **Polling Strategy**: Lightweight Livewire component or 5-second HTTP polling designed for cPanel low-footprint hosting.
- **Audio Chime**: Web Audio API tone played automatically when a new queue token status changes to \`called\`.

### 3. Automated SMS Gateway Integration
Triggered on status changes via Ethio Telecom / Africa's Talking API:
1. **Appointment Confirmed**: "Your appointment at Glamour Spa for 10:00 AM is confirmed!"
2. **Turn Approaching**: "Queue # A105: You are next in line! Please head to Barber Chair 2."
3. **Visit Receipt**: SMS containing e-receipt summary link after POS checkout.`,
    codeSnippets: [
      {
        filename: 'app/Http/Livewire/TvQueueDisplay.php',
        language: 'php',
        code: `<?php

namespace App\\Http\\Livewire;

use Livewire\\Component;
use App\\Models\\QueueEntry;
use App\\Models\\Branch;

class TvQueueDisplay extends Component
{
    public $branchId;
    public $businessUnitId;

    public function render()
    {
        $nowServing = QueueEntry::where('branch_id', $this->branchId)
            ->where('status', 'in_progress')
            ->orderBy('called_at', 'desc')
            ->take(4)
            ->get();

        $nextInQueue = QueueEntry::where('branch_id', $this->branchId)
            ->where('status', 'queued')
            ->orderBy('priority_score', 'desc')
            ->orderBy('created_at', 'asc')
            ->take(6)
            ->get();

        return view('livewire.tv-queue-display', [
            'nowServing' => $nowServing,
            'nextInQueue' => $nextInQueue,
            'branch' => Branch::find($this->branchId),
        ]);
    }
}
`,
      },
      {
        filename: 'database/migrations/2026_08_06_create_appointments_and_queues.php',
        language: 'php',
        code: `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('business_unit_id')->constrained();
            $table->foreignId('customer_id')->constrained();
            $table->foreignId('staff_id')->nullable()->constrained();
            $table->foreignId('service_id')->constrained();
            $table->dateTime('scheduled_start');
            $table->dateTime('scheduled_end');
            $table->integer('duration_minutes');
            $table->enum('status', ['scheduled', 'confirmed', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show']);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('queue_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('business_unit_id')->constrained();
            $table->foreignId('customer_id')->constrained();
            $table->foreignId('appointment_id')->nullable()->constrained();
            $table->string('queue_number'); // e.g. A105, S201
            $table->integer('priority_score')->default(10);
            $table->enum('status', ['queued', 'called', 'in_progress', 'completed', 'skipped', 'cancelled']);
            $table->string('assigned_chair_room')->nullable();
            $table->foreignId('staff_id')->nullable();
            $table->dateTime('called_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();
        });
    }
};
`,
      },
    ],
  },
  {
    id: 'development_roadmap_master',
    title: '4-Phase Development Roadmap & cPanel Launch Checklist',
    iconName: 'Map',
    summary: 'Practical Laravel 11, Livewire 3, MySQL & cPanel deployment roadmap divided into 4 high-impact execution phases, MVP scope, testing strategy, and backup policy.',
    contentMarkdown: `### 1. 4-Phase Execution Roadmap

#### Phase 1: Core Platform Foundation
- **Goal**: Establish secure multi-tenant architecture, tenancy scoping, user RBAC roles, branch hierarchies, and audit trail.
- **Scope**: Laravel 11 project, Tenancy Middleware, Spatie Permissions, Branch & Business Unit CRUD, Auth, Dashboard Shell.
- **Affected Tables**: \`companies\`, \`branches\`, \`business_units\`, \`users\`, \`roles\`, \`permissions\`, \`audit_logs\`.
- **Livewire Components**: \`TenantOnboarding\`, \`BranchManager\`, \`UserManager\`, \`AuditLogViewer\`.
- **Deliverables & Acceptance**: Working auth, tenant isolation validated via PHPUnit tests, cPanel deployment ready.

#### Phase 2: Salon Operations & Point of Sale (POS)
- **Goal**: Core daily salon workflow, customer registration, queue management, visit sessions, service dispatching, checkout & receipting.
- **Scope**: Customer CRM, Service Catalog, Visit Session POS, Cash/Telebirr/CBE Birr payments, E-receipt generation, SMS Gateway integration.
- **Affected Tables**: \`customers\`, \`services\`, \`visit_sessions\`, \`visit_services\`, \`payments\`, \`invoices\`, \`sms_logs\`.
- **Livewire Components**: \`ReceptionPos\`, \`QueueBoard\`, \`TvQueueDisplay\`, \`CustomerManager\`, \`VisitCheckout\`.
- **Deliverables & Acceptance**: End-to-end visit workflow, multi-staff session completion, invoice generation, real-time queue TV display.

#### Phase 3: Business Management & Inventory ERP
- **Goal**: Advanced ERP capabilities: commission rule engine, service product deduction (BOM), expenses, and multi-branch P&L reporting.
- **Scope**: Commission Rules Engine, Automated Stock Deductions, Inter-Branch Transfers, Expense Ledger, Staff Payroll Statements, P&L Analytics.
- **Affected Tables**: \`commission_rules\`, \`commissions\`, \`commission_settlements\`, \`inventory_items\`, \`stock_levels\`, \`stock_transactions\`, \`expenses\`.
- **Livewire Components**: \`CommissionRuleManager\`, \`InventoryLedger\`, \`StockTransferManager\`, \`ReportsDashboard\`.
- **Deliverables & Acceptance**: Automatic stock deduction per service, accurate staff commission payouts, financial reports.

#### Phase 4: SaaS Commercialization & Multi-Tenant Super Admin
- **Goal**: Scale platform into a self-service subscription SaaS with billing limits, tenant onboarding wizard, and super admin governance.
- **Scope**: Subscription Plans, Chapa/Paystack Gateway, Usage Limits (branch/staff cap enforcement), Tenant Suspension Middleware, Support Impersonation.
- **Affected Tables**: \`subscription_plans\`, \`company_subscriptions\`, \`subscription_invoices\`, \`system_metrics\`.
- **Livewire Components**: \`SuperAdminDashboard\`, \`TenantSubscriptionBilling\`, \`OnboardingWizard\`, \`ImpersonationBanner\`.
- **Deliverables & Acceptance**: Automated self-service signups, subscription feature gating, super admin dashboard.

### 2. Recommended Package List (Laravel 11)
- \`stancl/tenancy\` or custom single-database scope middleware.
- \`spatie/laravel-permission\` for fine-grained RBAC.
- \`livewire/livewire\` (v3) for real-time reactive UI components.
- \`barryvdh/laravel-dompdf\` for printable Ethiopian invoices & receipt PDFs.
- \`maatwebsite/excel\` for exporting financial & inventory audit logs.
- \`spatie/laravel-activitylog\` for immutable audit trail.

### 3. cPanel Deployment Strategy
1. **Directory Structure**: Separate public webroot (\`public_html\`) from private Laravel core code directory (\`../laravel_core\`).
2. **Environment Variables**: Configure \`APP_ENV=production\`, \`APP_DEBUG=false\`, \`DB_HOST=127.0.0.1\` with MySQL UTF8mb4.
3. **Cron Job Schedule**: Add cPanel cron task: \`* * * * * cd /home/user/laravel_core && php artisan schedule:run >> /dev/null 2>&1\`.
4. **Automated Daily Backups**: Daily database mysqldump script backed up to secure offsite S3/cloud storage.`,
    codeSnippets: [
      {
        filename: 'cpanel_deploy.sh',
        language: 'bash',
        code: `#!/bin/bash
# Production Deployment Script for cPanel Hosting
echo "Deploying Laravel 11 ERP App to cPanel..."

# Navigate to Laravel Core directory
cd /home/cpaneluser/laravel_app

# Pull latest code or extract release archive
php artisan down --message="System upgrade in progress. Back shortly!"

# Install composer packages without dev dependencies
composer install --no-dev --optimize-autoloader

# Run database migrations safely
php artisan migrate --force

# Optimize configuration and route caching
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Bring application back online
php artisan up

echo "Deployment completed successfully!"
`,
      },
    ],
  },
];








