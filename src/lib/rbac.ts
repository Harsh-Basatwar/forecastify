/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Role-Based Access Control (RBAC) System for Forecastify Enterprise
 *
 * 10 Enterprise Roles:
 * - organization_owner: Full authority across all organizations & stores
 * - organization_admin: Full administrative control across all org stores
 * - regional_manager: Multi-store operational oversight across assigned regions
 * - finance_manager: Financial oversight, credit ledgers, P&L, audits across stores
 * - procurement_manager: Central purchasing, demand aggregation, supplier management
 * - store_manager: Day-to-day operations for specific store outlets
 * - supervisor: Shift lead, task dispatch, shelf refilling
 * - cashier: POS billing, cash drawer, customer Khata
 * - stockboy: Physical inventory checks, stock transfer picking
 * - auditor: Read-only audit trails, GST compliance, cash balance checks
 */

export type UserRole =
  | 'organization_owner'
  | 'organization_admin'
  | 'regional_manager'
  | 'finance_manager'
  | 'procurement_manager'
  | 'store_manager'
  | 'supervisor'
  | 'cashier'
  | 'stockboy'
  | 'auditor'
  // Legacy aliases for backward compatibility
  | 'owner'
  | 'inventory_staff'
  | 'warehouse';

export type Permission =
  | 'view_hq_dashboard'
  | 'manage_organization_settings'
  | 'manage_organization_members'
  | 'manage_store_config'
  | 'create_stores'
  | 'switch_stores'
  | 'view_financials'
  | 'manage_purchases'
  | 'manage_central_procurement'
  | 'manage_stock_transfers'
  | 'approve_stock_transfers'
  | 'manage_khata'
  | 'cash_reconciliation'
  | 'manage_tasks'
  | 'execute_pos'
  | 'manage_inventory'
  | 'view_audit_logs'
  | 'view_health_score';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  organization_owner: [
    'view_hq_dashboard',
    'manage_organization_settings',
    'manage_organization_members',
    'manage_store_config',
    'create_stores',
    'switch_stores',
    'view_financials',
    'manage_purchases',
    'manage_central_procurement',
    'manage_stock_transfers',
    'approve_stock_transfers',
    'manage_khata',
    'cash_reconciliation',
    'manage_tasks',
    'execute_pos',
    'manage_inventory',
    'view_audit_logs',
    'view_health_score',
  ],
  organization_admin: [
    'view_hq_dashboard',
    'manage_organization_settings',
    'manage_organization_members',
    'manage_store_config',
    'create_stores',
    'switch_stores',
    'view_financials',
    'manage_purchases',
    'manage_central_procurement',
    'manage_stock_transfers',
    'approve_stock_transfers',
    'manage_khata',
    'cash_reconciliation',
    'manage_tasks',
    'execute_pos',
    'manage_inventory',
    'view_audit_logs',
    'view_health_score',
  ],
  regional_manager: [
    'view_hq_dashboard',
    'switch_stores',
    'view_financials',
    'manage_purchases',
    'manage_stock_transfers',
    'approve_stock_transfers',
    'manage_khata',
    'cash_reconciliation',
    'manage_tasks',
    'manage_inventory',
    'view_audit_logs',
    'view_health_score',
  ],
  finance_manager: [
    'view_hq_dashboard',
    'view_financials',
    'manage_khata',
    'cash_reconciliation',
    'approve_stock_transfers',
    'view_audit_logs',
    'view_health_score',
  ],
  procurement_manager: [
    'view_hq_dashboard',
    'manage_purchases',
    'manage_central_procurement',
    'manage_stock_transfers',
    'approve_stock_transfers',
    'manage_inventory',
    'view_health_score',
  ],
  store_manager: [
    'manage_store_config',
    'switch_stores',
    'view_financials',
    'manage_purchases',
    'manage_stock_transfers',
    'manage_khata',
    'cash_reconciliation',
    'manage_tasks',
    'execute_pos',
    'manage_inventory',
    'view_health_score',
  ],
  supervisor: [
    'execute_pos',
    'manage_stock_transfers',
    'manage_khata',
    'cash_reconciliation',
    'manage_tasks',
    'manage_inventory',
  ],
  cashier: [
    'execute_pos',
    'manage_khata',
    'cash_reconciliation',
    'manage_tasks',
  ],
  stockboy: [
    'manage_inventory',
    'manage_tasks',
    'manage_stock_transfers',
  ],
  auditor: [
    'view_hq_dashboard',
    'view_financials',
    'cash_reconciliation',
    'view_audit_logs',
    'view_health_score',
  ],

  // Legacy Mapping
  owner: [
    'view_hq_dashboard',
    'manage_organization_settings',
    'manage_organization_members',
    'manage_store_config',
    'create_stores',
    'switch_stores',
    'view_financials',
    'manage_purchases',
    'manage_central_procurement',
    'manage_stock_transfers',
    'approve_stock_transfers',
    'manage_khata',
    'cash_reconciliation',
    'manage_tasks',
    'execute_pos',
    'manage_inventory',
    'view_audit_logs',
    'view_health_score',
  ],
  inventory_staff: ['manage_inventory', 'manage_tasks', 'manage_stock_transfers'],
  warehouse: ['manage_inventory', 'manage_tasks', 'manage_purchases', 'manage_stock_transfers'],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole | string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Get all permissions for a given role
 */
export function getRolePermissions(role: UserRole | string | undefined | null): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role is allowed to view financial data
 */
export function canViewFinancials(role: UserRole | string | undefined | null): boolean {
  return hasPermission(role, 'view_financials');
}

/**
 * Helper to dynamically mask financial fields in an object for non-financial roles
 */
export function maskFinancials<T extends Record<string, any>>(data: T, role: UserRole | string | undefined | null): T {
  if (canViewFinancials(role)) return data;

  const masked = { ...data };
  const financialKeys = [
    'cost_price', 'costPrice',
    'profit', 'profit_margin', 'profitMargin',
    'margin', 'total_revenue', 'totalRevenue',
    'net_profit', 'netProfit', 'total_cost', 'totalCost',
    'expected_profit', 'expectedProfit',
  ];

  for (const key of Object.keys(masked)) {
    if (financialKeys.includes(key)) {
      (masked as any)[key] = undefined;
    }
  }

  return masked;
}

/**
 * Get readable role label
 */
export function getRoleLabel(role: UserRole | string | undefined | null): string {
  switch (role) {
    case 'organization_owner':
    case 'owner':
      return 'Organization Owner';
    case 'organization_admin':
      return 'Organization Admin';
    case 'regional_manager':
      return 'Regional Manager';
    case 'finance_manager':
      return 'Finance Manager';
    case 'procurement_manager':
      return 'Procurement Manager';
    case 'store_manager':
      return 'Store Manager';
    case 'supervisor':
      return 'Store Supervisor';
    case 'cashier':
      return 'Cashier';
    case 'stockboy':
    case 'inventory_staff':
      return 'Stock / Inventory Staff';
    case 'warehouse':
      return 'Warehouse Specialist';
    case 'auditor':
      return 'Auditor';
    default:
      return 'Store Manager';
  }
}
