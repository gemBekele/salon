import React, { createContext, useContext } from 'react';
import type {
  AuthUser, AuthUserRole, Company, Branch, BusinessUnit,
  Staff, Service, Customer, VisitSession, CommissionLog,
  CommissionRule, InventoryItem, ExpenseRecord, SmsLog,
  AuditLog, PaymentMethod, SubscriptionPlan,
} from '../types';

export interface AppState {
  // Auth
  user: AuthUser | null;
  bootstrapping: boolean;
  staffSessionPin: string | undefined;

  // Org
  companies: Company[];
  selectedCompany: Company | null;
  branches: Branch[];
  selectedBranch: Branch | null;
  businessUnits: BusinessUnit[];
  selectedBusinessUnit: BusinessUnit | null;

  // Data
  staffList: Staff[];
  services: Service[];
  customers: Customer[];
  visitSessions: VisitSession[];
  commissionLogs: CommissionLog[];
  commissionRules: CommissionRule[];
  inventoryItems: InventoryItem[];
  expenses: ExpenseRecord[];
  smsLogs: SmsLog[];
  auditLogs: AuditLog[];
  users: any[];
  subscriptionPlans: SubscriptionPlan[];

  // UI
  dbError: string | null;
  isAiModalOpen: boolean;
  websiteTheme: 'dark' | 'light';
  isBookingModalOpen: boolean;
  bookingServiceId: string | null;

  // Actions
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  setStaffSessionPin: React.Dispatch<React.SetStateAction<string | undefined>>;
  setSelectedCompany: React.Dispatch<React.SetStateAction<Company | null>>;
  setSelectedBranch: React.Dispatch<React.SetStateAction<Branch | null>>;
  setSelectedBusinessUnit: React.Dispatch<React.SetStateAction<BusinessUnit | null>>;
  setDbError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsAiModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setWebsiteTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>;
  setIsBookingModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setBookingServiceId: React.Dispatch<React.SetStateAction<string | null>>;

  fetchDbState: (sections?: string[]) => Promise<void>;
  handleLogin: (u: AuthUser, pin?: string) => void;
  handleLogout: () => Promise<void>;

  // CRUD handlers
  handleCreateVisitSession: (s: VisitSession) => Promise<void>;
  handleAddCustomer: (c: Customer) => Promise<void>;
  handleUpdateSessionStatus: (id: string, status: 'queued' | 'in_progress' | 'completed' | 'cancelled') => Promise<void>;
  handleUpdateSessionServices: (id: string, svc: any) => Promise<void>;
  handleCheckoutSession: (id: string, method: PaymentMethod, ref: string) => Promise<void>;
  handleUpdateServiceStatus: (serviceId: string, status: 'in_progress' | 'completed') => Promise<void>;
  handleCancelSession: (sessionId: string, reason?: string) => Promise<void>;
  handleRemoveSessionService: (sessionId: string, serviceId: string) => Promise<void>;
  handleAddCompany: (c: Company) => Promise<void>;
  handleAddBranch: (b: Branch) => Promise<void>;
  handleAddStaff: (s: Staff) => Promise<void>;
  handleAddService: (s: Service) => Promise<void>;
  handleAddInventoryItem: (i: InventoryItem) => Promise<void>;
  handleUpdateInventoryStock: (id: string, qty: number) => Promise<void>;
  handleSaveCommissionRule: (r: CommissionRule) => Promise<void>;
  handleAddExpense: (e: ExpenseRecord) => Promise<void>;
  handleAddAuditLog: (l: AuditLog) => Promise<void>;
  handleUpdateBranch: (b: Branch) => Promise<void>;
  handleDeleteBranch: (id: string) => Promise<void>;
  handleUpdateStaff: (s: Staff) => Promise<void>;
  handleDeleteStaff: (id: string) => Promise<void>;
  handleUpdateService: (s: Service) => Promise<void>;
  handleDeleteService: (id: string) => Promise<void>;
  handleUpdateInventoryItem: (i: InventoryItem) => Promise<void>;
  handleDeleteInventoryItem: (id: string) => Promise<void>;
  handleAddUser: (u: any) => Promise<void>;
  handleUpdateUser: (u: any & { password?: string }) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ value, children }: { value: AppState; children: React.ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
