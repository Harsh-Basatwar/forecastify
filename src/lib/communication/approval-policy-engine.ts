/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ApprovalPolicyEngine — Evaluates Dynamic Organizational Approval Rules
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface PolicyEvaluationResult {
  requiresApproval: boolean;
  requiredRole: 'store_manager' | 'procurement_manager' | 'organization_admin';
  policyName?: string;
  reason?: string;
  autoApproved: boolean;
}

export class ApprovalPolicyEngine {
  /**
   * Evaluate proposed AI action against organizational policies
   */
  async evaluateAction(
    organizationId: string,
    actionType: string,
    entityType: string,
    amount: number = 0,
    variancePct: number = 0
  ): Promise<PolicyEvaluationResult> {
    try {
      const { data: policies } = await supabase
        .from('approval_policies')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('trigger_action', actionType)
        .eq('is_active', true);

      if (!policies || policies.length === 0) {
        // Default System Policy Rules
        if (amount > 50000) {
          return {
            requiresApproval: true,
            requiredRole: 'procurement_manager',
            reason: 'Transaction exceeds standard limit of ₹50,000',
            autoApproved: false,
          };
        }
        if (variancePct > 5.0) {
          return {
            requiresApproval: true,
            requiredRole: 'store_manager',
            reason: `Price variance of ${variancePct}% exceeds auto limit of 5%`,
            autoApproved: false,
          };
        }
        return {
          requiresApproval: false,
          requiredRole: 'store_manager',
          autoApproved: true,
        };
      }

      // Check matched policy rules
      for (const policy of policies) {
        if (amount <= Number(policy.auto_approve_if_below)) {
          return {
            requiresApproval: false,
            requiredRole: policy.required_role as any,
            policyName: policy.policy_name,
            autoApproved: true,
          };
        }

        if (amount >= Number(policy.min_amount) || variancePct >= Number(policy.max_variance_pct)) {
          return {
            requiresApproval: true,
            requiredRole: policy.required_role as any,
            policyName: policy.policy_name,
            reason: `Triggered policy: ${policy.policy_name}`,
            autoApproved: false,
          };
        }
      }

      return { requiresApproval: false, requiredRole: 'store_manager', autoApproved: true };
    } catch (err) {
      console.error('[ApprovalPolicyEngine] Evaluation error:', err);
      return { requiresApproval: true, requiredRole: 'store_manager', autoApproved: false, reason: 'Policy check error fallback' };
    }
  }
}

export const approvalPolicyEngine = new ApprovalPolicyEngine();
