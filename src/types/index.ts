export type PersonaRole =
  | 'saas_super_admin'
  | 'tenant_admin'
  | 'receptionist'
  | 'staff_member'
  | 'architect_lead'
  | 'queue_tv';

export type AuthUserRole = 'super_admin' | 'tenant_manager' | 'receptionist' | 'staff';

export interface AuthUser {
  id: string;
  companyId: string | null;
  name: string;
  email: string;
  role: AuthUserRole;
  pinChanged?: boolean;
}

/** A staff member shown on the PIN login screen (names only). */
export interface StaffLoginOption {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
}

export type BusinessUnitType =
  | 'mens_salon'
  | 'womens_salon'
  | 'spa_center'
  | 'massage_center';

export type SubscriptionPlanTier = 'starter' | 'pro_multi_unit' | 'enterprise';

export interface SubscriptionPlan {
  id: string;
  name: string;
  maxBranches: number;
  maxBusinessUnits: number;
  maxStaff: number;
  monthlyFeeEtb: number;
  features: string[];
}

export interface Company {
  id: string; // company_id
  name: string;
  slug: string;
  subscriptionPlanId: string;
  status: 'active' | 'suspended' | 'trial';
  currency: string; // default ETB
  timezone: string; // default Africa/Addis_Ababa
  phone: string;
  email: string;
  createdAt: string;
}

export interface Branch {
  id: string; // branch_id
  companyId: string;
  name: string;
  city: string; // e.g. Addis Ababa, Hawassa, Adama
  address: string;
  phone: string;
  isMainBranch: boolean;
  status: 'active' | 'inactive';
  dailyExpenseLimitEtb?: number;
}

export interface BusinessUnit {
  id: string; // business_unit_id
  companyId: string;
  branchId: string;
  type: BusinessUnitType;
  name: string;
  code: string; // e.g. MS-BOL-01
  status: 'active' | 'inactive';
}

export interface Staff {
  id: string;
  companyId: string;
  branchId: string;
  businessUnitId: string;
  name: string;
  phone: string;
  email: string;
  role: 'receptionist' | 'barber' | 'hairstylist' | 'masseuse' | 'esthetician' | 'manager';
  specialties: string[];
  defaultCommissionPercentage: number;
  status: 'available' | 'busy' | 'off_shift' | 'inactive';
  avatarUrl?: string;
}

export interface InventoryRequirement {
  inventoryItemId: string;
  quantityUsed: number;
}

export interface Service {
  id: string;
  companyId: string;
  businessUnitId: string;
  name: string;
  category: string;
  priceEtb: number;
  durationMinutes: number;
  commissionType: 'percentage' | 'fixed_amount';
  commissionValue: number;
  requiredInventory: InventoryRequirement[];
  isActive: boolean;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone: string; // e.g., +251 91 123 4567
  email?: string;
  totalVisits: number;
  totalSpentEtb: number;
  loyaltyPoints: number;
  isVip: boolean;
  notes?: string;
  createdAt: string;
}

export interface SessionServiceItem {
  id: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  priceEtb: number;
  durationMinutes: number;
  commissionEarnedEtb: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt?: string;
}

export type SessionStatus = 'queued' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentMethod = 'telebirr' | 'cbe_birr' | 'cash' | 'card' | 'mixed';

export interface VisitSession {
  id: string;
  companyId: string;
  branchId: string;
  businessUnitId: string;
  queueNumber: string; // e.g. Q-104
  customerId: string;
  customerName: string;
  customerPhone: string;
  services: SessionServiceItem[];
  status: SessionStatus;
  subtotalEtb: number;
  discountEtb: number;
  taxEtb: number;
  netTotalEtb: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  isPaid: boolean;
  startedAt: string;
  completedAt?: string;
  notes?: string;
  createdAt?: string;
}

export interface CommissionRule {
  id: string;
  companyId: string;
  targetType: 'staff' | 'service';
  targetId: string; // staffId or serviceId
  targetName: string;
  type: 'percentage' | 'fixed_amount';
  value: number; // e.g. 35 for 35% or 200 for 200 ETB
  deductProductCost?: boolean;
  isActive: boolean;
  updatedAt: string;
}

export interface CommissionLog {
  id: string;
  companyId: string;
  branchId: string;
  staffId: string;
  staffName: string;
  visitSessionId: string;
  serviceName: string;
  servicePriceEtb: number;
  commissionAmountEtb: number;
  ruleApplied: string; // e.g. "25% Haircut Rate"
  payoutStatus: 'unpaid' | 'payout_requested' | 'paid';
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  companyId: string;
  branchId: string;
  businessUnitId: string;
  name: string;
  sku: string;
  unit: string; // 'ml', 'pcs', 'bottle', 'box'
  currentStock: number;
  reorderLevel: number;
  unitCostEtb: number;
  sellingPriceEtb?: number;
  lastRestockedAt: string;
}

export interface ExpenseRecord {
  id: string;
  companyId: string;
  branchId: string;
  businessUnitId?: string;
  category: 'rent' | 'utilities' | 'inventory_purchase' | 'salary' | 'marketing' | 'other';
  amountEtb: number;
  description: string;
  paymentMethod: PaymentMethod;
  recordedBy: string;
  date: string;
  isRecurring?: boolean;
  recurrenceFrequency?: 'weekly' | 'monthly' | 'quarterly';
  nextDueDate?: string;
  autoProcessTrigger?: boolean;
}

export interface AuditLog {
  id: string;
  companyId: string;
  branchId?: string;
  actionType: 'inventory_adjustment' | 'commission_change' | 'payment_edit' | 'expense_added' | 'price_change' | 'security_event';
  description: string;
  performedBy: string;
  timestamp: string;
  details?: string;
  ipAddress?: string;
}

export interface SmsLog {
  id: string;
  companyId: string;
  recipientPhone: string;
  messageType: 'appointment_reminder' | 'queue_turn_alert' | 'session_receipt' | 'marketing_promo';
  content: string;
  status: 'sent' | 'queued' | 'failed';
  sentAt: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: AuthUserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface ArchitectureDocSection {
  id: string;
  title: string;
  iconName: string;
  summary: string;
  contentMarkdown: string;
  codeSnippets?: {
    filename: string;
    language: string;
    code: string;
  }[];
}
