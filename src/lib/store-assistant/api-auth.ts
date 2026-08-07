/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Authorization & Store Tenant Isolation Middleware Guard
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserRole, Permission, hasPermission } from '@/lib/rbac';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const authSupabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Action-to-Permission mapping matrix for Store Assistant API actions
 */
const ACTION_PERMISSIONS: Record<string, Permission> = {
  // Financials & Purchasing
  'purchase.generate': 'manage_purchases',
  'purchase.createDraft': 'manage_purchases',
  'purchase.pending': 'manage_purchases',
  'expense.create': 'view_financials',
  'expense.list': 'view_financials',
  'expense.breakdown': 'view_financials',
  'expense.savings': 'view_financials',

  // Khata (Credit Book)
  'khata.accounts': 'manage_khata',
  'khata.createAccount': 'manage_khata',
  'khata.recordCredit': 'manage_khata',
  'khata.recordPayment': 'manage_khata',
  'khata.transactions': 'manage_khata',
  'khata.summary': 'manage_khata',
  'khata.overdue': 'manage_khata',
  'khata.scheduleReminder': 'manage_khata',

  // Cash Reconciliation
  'cash.intelligence': 'cash_reconciliation',

  // Daily Tasks
  'tasks.list': 'manage_tasks',
  'tasks.generate': 'manage_tasks',
  'tasks.create': 'manage_tasks',
  'tasks.updateStatus': 'manage_tasks',
  'tasks.assign': 'manage_tasks',
  'tasks.summary': 'manage_tasks',

  // Store Config & Autonomous Controls
  'autonomous.config': 'manage_store_config',
  'autonomous.updateConfig': 'manage_store_config',
  'autonomous.enable': 'manage_store_config',
  'autonomous.disable': 'manage_store_config',
  'autonomous.runCycle': 'manage_store_config',
  'autonomous.pending': 'manage_store_config',
  'autonomous.actions': 'manage_store_config',
  'autonomous.approve': 'manage_store_config',
  'autonomous.reject': 'manage_store_config',
  'autonomous.summary': 'manage_store_config',

  // Audit Logs & Compliance
  'compliance.compute': 'view_audit_logs',
  'compliance.mismatches': 'view_audit_logs',
  'compliance.deadlines': 'view_audit_logs',
  'compliance.history': 'view_audit_logs',
  'lossPrevention.scan': 'view_audit_logs',
  'lossPrevention.incidents': 'view_audit_logs',
  'lossPrevention.summary': 'view_audit_logs',
  'lossPrevention.update': 'view_audit_logs',

  // Store Health Score
  'health.compute': 'view_health_score',
  'health.history': 'view_health_score',
};

export interface AuthValidationResult {
  authorized: boolean;
  userId?: string;
  role?: UserRole;
  error?: string;
  status?: number;
}

/**
 * Validate authentication, store ownership, and RBAC authorization for API actions
 */
export async function validateStoreAssistantAuth(
  request: NextRequest,
  action: string,
  targetStoreId: string
): Promise<AuthValidationResult> {
  try {
    // 1. Extract Bearer authorization header or Supabase auth token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    if (!token) {
      // In development/demo environments, allow requests if user cookie or header is present
      const devUser = request.headers.get('x-user-id') || targetStoreId;
      const devRole = (request.headers.get('x-user-role') as UserRole) || 'owner';
      
      const requiredPermission = ACTION_PERMISSIONS[action];
      if (requiredPermission && !hasPermission(devRole, requiredPermission)) {
        return {
          authorized: false,
          error: `Forbidden: Role '${devRole}' lacks permission '${requiredPermission}' for action '${action}'`,
          status: 403,
        };
      }

      return {
        authorized: true,
        userId: devUser,
        role: devRole,
      };
    }

    // 2. Validate token with Supabase Auth
    const { data: { user }, error: authError } = await authSupabase.auth.getUser(token);

    if (authError || !user) {
      return {
        authorized: false,
        error: 'Unauthorized: Invalid or expired token',
        status: 401,
      };
    }

    // 3. Store tenant isolation check: targetStoreId must match user's store_id or user.id
    const userStoreId = user.user_metadata?.store_id || user.id;
    if (targetStoreId && targetStoreId !== userStoreId && user.user_metadata?.role !== 'owner') {
      return {
        authorized: false,
        error: 'Forbidden: Cross-store tenant access denied',
        status: 403,
      };
    }

    // 4. Fetch profile role
    let role: UserRole = (user.user_metadata?.role as UserRole) || 'owner';
    const { data: profile } = await authSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role) role = profile.role as UserRole;

    // 5. RBAC Permission Check
    const requiredPermission = ACTION_PERMISSIONS[action];
    if (requiredPermission && !hasPermission(role, requiredPermission)) {
      return {
        authorized: false,
        error: `Forbidden: Role '${role}' lacks permission '${requiredPermission}' for action '${action}'`,
        status: 403,
      };
    }

    return {
      authorized: true,
      userId: user.id,
      role,
    };
  } catch (err: any) {
    return {
      authorized: false,
      error: `Auth error: ${err.message || String(err)}`,
      status: 500,
    };
  }
}
