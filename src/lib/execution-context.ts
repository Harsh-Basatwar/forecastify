import { UserRole, Permission } from "./rbac";

/**
 * Standardized ExecutionContext object passed to all API handlers,
 * background jobs, and Store Assistant drivers.
 */
export interface ExecutionContext {
  organizationId: string;
  storeId: string;
  userId: string;
  memberId: string;
  role: UserRole;
  permissions: Permission[];
  timezone: string;
  currency: string;
  isHqScope: boolean;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  currency: string;
  timeZone: string;
  plan: string;
  subscriptionStatus: string;
  maxStores: number;
  maxUsers: number;
}

export interface StoreInfo {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  storeType: 'retail' | 'warehouse' | 'dark_store' | 'distribution_center';
  status: 'ACTIVE' | 'TEMP_CLOSED' | 'UNDER_SETUP' | 'ARCHIVED';
  warehouseEnabled: boolean;
  city?: string;
  state?: string;
  address?: string;
}

/**
 * Helper to build an ExecutionContext object
 */
export function createExecutionContext(params: {
  organizationId: string;
  storeId: string;
  userId: string;
  memberId: string;
  role: UserRole;
  permissions: Permission[];
  timezone?: string;
  currency?: string;
  isHqScope?: boolean;
}): ExecutionContext {
  return {
    organizationId: params.organizationId,
    storeId: params.storeId,
    userId: params.userId,
    memberId: params.memberId,
    role: params.role,
    permissions: params.permissions,
    timezone: params.timezone || "Asia/Kolkata",
    currency: params.currency || "INR",
    isHqScope: params.isHqScope ?? (params.role === 'organization_owner' || params.role === 'organization_admin' || params.role === 'regional_manager'),
  };
}
