import React, { createContext, useContext } from 'react';
import { GitBranch, Users, Scissors, Package, BarChart3, TrendingUp, ShieldCheck } from 'lucide-react';

export type AdminTab =
  | 'branches'
  | 'staff'
  | 'services'
  | 'inventory'
  | 'financials'
  | 'reports'
  | 'audit'
  | 'users';

export interface AdminTabItem {
  id: AdminTab;
  label: string;
  icon: React.ElementType;
}

export const ADMIN_TABS: AdminTabItem[] = [
  { id: 'branches', label: 'Branches', icon: GitBranch },
  { id: 'staff', label: 'Staff Roster', icon: Users },
  { id: 'services', label: 'Service Catalog', icon: Scissors },
  { id: 'inventory', label: 'Inventory & Stock', icon: Package },
  { id: 'financials', label: 'Financials & Expenses', icon: BarChart3 },
  { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp },
  { id: 'audit', label: 'Security Audit', icon: ShieldCheck },
  { id: 'users', label: 'User Management', icon: ShieldCheck },
];

export const AdminTabContext = createContext<{ adminTab: AdminTab; setAdminTab: (tab: AdminTab) => void }>({
  adminTab: 'branches',
  setAdminTab: () => {},
});

export function useAdminTab() {
  return useContext(AdminTabContext);
}