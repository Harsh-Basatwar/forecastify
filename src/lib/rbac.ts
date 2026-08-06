/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Role-Based Access Control (RBAC) System for Forecastify Enterprise
 *
 * Roles:
 * - owner: Full platform control, financial visibility, configuration, approvals
 * - regional_manager: Multi-store oversight, strategy, reporting, approvals
 * - store_manager: Day-to-day store operations, task assignment, order approvals
 * - cashier: POS billing, cash drawer, inventory lookup (NO FINANCIAL MARGINS/PROFIT ACCESS)
 * - inventory_staff: Shelf refilling, stock counts, receiving, label printing
 * - warehouse: Stock movement, vendor receiving, delivery logistics (NO FINANCIAL ACCESS)
 * - auditor: Read-only access to audit trails, GST compliance, cash reconciliations
 */

export type UserRole =
  | 'owner'
  | 'regional_manager'
  | 'store_manager'
  | 'cashier'
  | 'inventory_staff'
  | 'warehouse'
  | 'auditor';

export type Permission =
  | 'view_financials'       // Revenue, profit, cost prices, profit margins, cash balances
  | 'manage_purchases'      // Create, approve, send purchase orders
  | 'manage_khata'          // Customer credit ledger, record payments, send reminders
  | 'cash_reconciliation'   // Drawer count, cash mismatch reports, closing reports
  | 'manage_tasks'          // Assign tasks, create SOPs, monitor employee productivity
  | 'manage_store_config'   // Autonomous settings, approval limits, quiet hours
  | 'view_audit_logs'       // Audit trails, compliance history, loss incidents
  | 'execute_pos'           // Sales billing, product search, POS transactions
  | 'manage_inventory'      // Stock count, shelf refill, price updates
  | 'view_health_score';    // Store health index and trend breakdown

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'view_financials',
    'manage_purchases',
    'manage_khata',
    'cash_reconciliation',
    'manage_tasks',
    'manage_store_config',
    'view_audit_logs',
    'execute_pos',
    'manage_inventory',
    'view_health_score',
  ],
  regional_manager: [
    'view_financials',
    'manage_purchases',
    'manage_khata',
    'cash_reconciliation',
    'manage_tasks',
    'view_audit_logs',
    'manage_inventory',
    'view_health_score',
  ],
  store_manager: [
    'view_financials',
    'manage_purchases',
    'manage_khata',
    'cash_reconciliation',
    'manage_tasks',
    'execute_pos',
    'manage_inventory',
    'view_health_score',
  ],
  cashier: [
    'execute_pos',
    'manage_khata',
    'cash_reconciliation',
    'manage_tasks',
  ],
  inventory_staff: [
    'manage_inventory',
    'manage_tasks',
  ],
  warehouse: [
    'manage_inventory',
    'manage_tasks',
    'manage_purchases',
  ],
  auditor: [
    'view_financials',
    'cash_reconciliation',
    'view_audit_logs',
    'view_health_score',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false; // Default to restrictive
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a role is allowed to view financial data (revenue, profit, cost price)
 */
export function canViewFinancials(role: UserRole | undefined | null): boolean {
  return hasPermission(role, 'view_financials');
}

/**
 * Helper to dynamically mask financial fields in an object for non-financial roles
 */
export function maskFinancials<T extends Record<string, any>>(data: T, role: UserRole | undefined | null): T {
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
export function getRoleLabel(role: UserRole | undefined | null): string {
  switch (role) {
    case 'owner': return 'Store Owner';
    case 'regional_manager': return 'Regional Manager';
    case 'store_manager': return 'Store Manager';
    case 'cashier': return 'Cashier';
    case 'inventory_staff': return 'Inventory Staff';
    case 'warehouse': return 'Warehouse Specialist';
    case 'auditor': return 'Auditor';
    default: return 'Store Owner';
  }
}
