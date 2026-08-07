/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AutonomousEngine — The Flagship "Autopilot" Store Operating System
 *
 * Runs an hourly cycle that:
 * 1. Reads autonomous_config to see what's enabled
 * 2. Evaluates triggers across all services
 * 3. Creates autonomous_actions (pending or auto-approved)
 * 4. Executes auto-approved actions immediately
 * 5. Queues non-auto-approved actions for owner review
 */

import { createClient } from '@supabase/supabase-js';
import type { AutonomousConfigRow, AutonomousActionRow, AutonomousCycleResult } from './types';
import { purchaseAutomationService } from './purchase-automation-service';
import { dailyBriefService } from './daily-brief-service';
import { expiryService } from './expiry-service';
import { khataService } from './khata-service';
import { taskService } from './task-service';
import { vendorCommunicationService } from './vendor-communication-service';
import { healthService } from './health-service';
import { complianceService } from './compliance-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

export class AutonomousEngine {

  /** Get or create autonomous config for a store */
  async getConfig(storeId: string): Promise<AutonomousConfigRow> {
    try {
      const { data: existing } = await supabase
        .from('autonomous_config')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

      if (existing) return existing as AutonomousConfigRow;

      // Create default config (everything off)
      const { data: created } = await supabase
        .from('autonomous_config')
        .insert({ store_id: storeId })
        .select()
        .maybeSingle();

      if (created) return created as AutonomousConfigRow;
    } catch (err) {
      console.error('getConfig error:', err);
    }

    return {
      id: 'default-config',
      store_id: storeId,
      is_enabled: false,
      auto_purchase_orders: false,
      auto_stockout_orders: false,
      auto_employee_tasks: false,
      auto_expiry_actions: false,
      auto_khata_reminders: false,
      auto_supplier_comms: false,
      auto_health_alerts: false,
      auto_compliance_prep: false,
      auto_morning_brief: false,
      auto_closing_report: false,
      po_auto_approve_limit: 5000,
      expiry_auto_discount_days: 7,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as AutonomousConfigRow;
  }

  /** Update autonomous config */
  async updateConfig(storeId: string, updates: Partial<AutonomousConfigRow>): Promise<AutonomousConfigRow | null> {
    const { data, error } = await supabase
      .from('autonomous_config')
      .update(updates)
      .eq('store_id', storeId)
      .select()
      .single();

    if (error) return null;
    return data as AutonomousConfigRow;
  }

  /** Enable autonomous mode */
  async enable(storeId: string): Promise<AutonomousConfigRow | null> {
    return this.updateConfig(storeId, {
      is_enabled: true,
      enabled_at: new Date().toISOString(),
    });
  }

  /** Disable autonomous mode */
  async disable(storeId: string): Promise<AutonomousConfigRow | null> {
    return this.updateConfig(storeId, { is_enabled: false });
  }

  /** Run the autonomous cycle — the core engine */
  async runCycle(storeId: string): Promise<AutonomousCycleResult> {
    const config = await this.getConfig(storeId);

    if (!config.is_enabled) {
      return { skipped: true, totalActions: 0, autoApproved: 0, pendingApproval: 0, errors: 0, executedAt: new Date().toISOString() };
    }

    // Check quiet hours
    const now = new Date();
    const currentHour = now.getHours();
    const quietStart = parseInt(config.quiet_hours_start?.split(':')[0] || '22');
    const quietEnd = parseInt(config.quiet_hours_end?.split(':')[0] || '7');
    if (currentHour >= quietStart || currentHour < quietEnd) {
      return { skipped: true, totalActions: 0, autoApproved: 0, pendingApproval: 0, errors: 0, executedAt: now.toISOString() };
    }

    const result: AutonomousCycleResult = { totalActions: 0, autoApproved: 0, pendingApproval: 0, errors: 0, executedAt: now.toISOString() };

    try {
      // 1. Morning/closing brief
      if (config.auto_morning_brief) {
        const hour = now.getHours();
        if (hour >= 6 && hour <= 8) {
          await this.createAction(storeId, config, {
            action_type: 'report_generation',
            action_title: 'Morning Brief Generated',
            action_description: 'Auto-generated morning business brief',
            urgency: 'normal',
            data: { briefType: 'morning' },
          });
          await dailyBriefService.getMorningBrief(storeId);
          result.totalActions++;
          result.autoApproved++;
        }
      }

      if (config.auto_closing_report) {
        const hour = now.getHours();
        if (hour >= 20 && hour <= 22) {
          await this.createAction(storeId, config, {
            action_type: 'report_generation',
            action_title: 'Closing Report Generated',
            action_description: 'Auto-generated end-of-day closing report',
            urgency: 'normal',
            data: { briefType: 'closing' },
          });
          await dailyBriefService.getClosingBrief(storeId);
          result.totalActions++;
          result.autoApproved++;
        }
      }

      // 2. Auto purchase orders
      if (config.auto_purchase_orders || config.auto_stockout_orders) {
        const smartPOs = await purchaseAutomationService.generateSmartPOs(storeId);
        for (const po of smartPOs) {
          const autoApprove = po.totalAmount <= config.po_auto_approve_limit;
          const action = await this.createAction(storeId, config, {
            action_type: po.items.some(i => i.stockoutDays <= 0) ? 'stockout_order' : 'purchase_order',
            action_title: `Auto PO: ${po.items.length} items, ₹${po.totalAmount.toLocaleString('en-IN')}`,
            action_description: po.justification,
            urgency: po.items.some(i => i.stockoutDays <= 1) ? 'high' : 'normal',
            data: { smartPO: po },
            autoApprove,
          });

          if (autoApprove && action) {
            const poId = await purchaseAutomationService.createDraftPO(storeId, po);
            if (poId) {
              await supabase.from('autonomous_actions').update({
                executed_at: now.toISOString(),
                execution_result: { poId },
              }).eq('id', action.id);
            }
            result.autoApproved++;
          } else {
            result.pendingApproval++;
          }
          result.totalActions++;
        }
      }

      // 3. Auto employee tasks
      if (config.auto_employee_tasks) {
        const tasks = await taskService.generateDailyTasks(storeId);
        if (tasks.length > 0) {
          await this.createAction(storeId, config, {
            action_type: 'task_assignment',
            action_title: `${tasks.length} daily tasks auto-generated`,
            action_description: `Tasks include: ${tasks.slice(0, 3).map(t => t.title).join(', ')}`,
            urgency: 'normal',
            data: { taskIds: tasks.map(t => t.id) },
            autoApprove: true,
          });
          result.totalActions++;
          result.autoApproved++;
        }
      }

      // 4. Auto expiry actions
      if (config.auto_expiry_actions) {
        const tiers = await expiryService.scan(storeId);
        const urgent = tiers[0].items.concat(tiers[1].items);
        for (const item of urgent.slice(0, 10)) {
          const autoApprove = item.daysUntilExpiry <= config.expiry_auto_discount_days;
          await this.createAction(storeId, config, {
            action_type: 'expiry_action',
            action_title: `Expiry Action: ${item.name}`,
            action_description: `${item.quantity} units expiring in ${item.daysUntilExpiry} days. Recommended: ${item.recommendedAction}`,
            urgency: item.daysUntilExpiry <= 0 ? 'critical' : 'high',
            data: { item, action: item.recommendedAction },
            autoApprove,
          });
          if (autoApprove) result.autoApproved++;
          else result.pendingApproval++;
          result.totalActions++;
        }
      }

      // 5. Auto khata reminders
      if (config.auto_khata_reminders) {
        const sent = await khataService.sendDueReminders(storeId);
        if (sent > 0) {
          await this.createAction(storeId, config, {
            action_type: 'khata_reminder',
            action_title: `${sent} khata reminders sent`,
            action_description: `Sent payment reminders to ${sent} customers with overdue credit`,
            urgency: 'normal',
            data: { sentCount: sent },
            autoApprove: true,
          });
          result.totalActions++;
          result.autoApproved++;
        }
      }

      // 6. Auto supplier communications
      if (config.auto_supplier_comms) {
        const followUpsSent = await vendorCommunicationService.sendDueFollowUps(storeId);
        if (followUpsSent > 0) {
          await this.createAction(storeId, config, {
            action_type: 'supplier_communication',
            action_title: `${followUpsSent} supplier follow-ups sent`,
            action_description: `Auto-sent follow-ups for pending purchase orders`,
            urgency: 'normal',
            data: { count: followUpsSent },
            autoApprove: true,
          });
          result.totalActions++;
          result.autoApproved++;
        }
      }

      // 7. Health alerts
      if (config.auto_health_alerts) {
        const health = await healthService.compute(storeId);
        if (health.overall_score < 50) {
          await this.createAction(storeId, config, {
            action_type: 'health_alert',
            action_title: `Store health critical: ${health.overall_score}/100`,
            action_description: health.recommendations[0] || 'Review store health dashboard',
            urgency: health.overall_score < 30 ? 'critical' : 'high',
            data: { score: health.overall_score, trend: health.trend },
          });
          result.totalActions++;
          result.pendingApproval++;
        }
      }

      // 8. Compliance alerts
      if (config.auto_compliance_prep) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        await complianceService.computeMonthlyGST(storeId, month, year);
        const deadlines = await complianceService.getFilingDeadlines(storeId);
        for (const dl of deadlines) {
          if (dl.daysUntilDue <= 5 && dl.status === 'pending') {
            await this.createAction(storeId, config, {
              action_type: 'compliance_alert',
              action_title: `${dl.filing} due in ${dl.daysUntilDue} days`,
              action_description: `Filing deadline: ${dl.dueDate}. Status: ${dl.status}`,
              urgency: dl.daysUntilDue <= 2 ? 'critical' : 'high',
              data: { filing: dl.filing, dueDate: dl.dueDate },
            });
            result.totalActions++;
            result.pendingApproval++;
          }
        }
      }

    } catch (error) {
      console.error('Autonomous cycle error:', error);
      result.errors++;
    }

    return result;
  }

  /** Create an autonomous action */
  private async createAction(
    storeId: string,
    config: AutonomousConfigRow,
    action: {
      action_type: string;
      action_title: string;
      action_description: string;
      urgency: string;
      data: Record<string, any>;
      autoApprove?: boolean;
      reference_id?: string;
      reference_table?: string;
    }
  ): Promise<AutonomousActionRow | null> {
    const autoApprove = action.autoApprove ?? false;
    const { data, error } = await supabase
      .from('autonomous_actions')
      .insert({
        store_id: storeId,
        action_type: action.action_type,
        action_title: action.action_title,
        action_description: action.action_description,
        urgency: action.urgency,
        data: action.data,
        reference_id: action.reference_id || null,
        reference_table: action.reference_table || null,
        approval_status: autoApprove ? 'auto_approved' : 'pending',
        auto_approved: autoApprove,
        approved_at: autoApprove ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) return null;
    return data as AutonomousActionRow;
  }

  /** Get pending actions for owner review */
  async getPendingActions(storeId: string): Promise<AutonomousActionRow[]> {
    const { data } = await supabase
      .from('autonomous_actions')
      .select('*')
      .eq('store_id', storeId)
      .eq('approval_status', 'pending')
      .order('urgency', { ascending: true })
      .order('created_at', { ascending: false });

    return (data || []) as AutonomousActionRow[];
  }

  /** Get all actions (with optional filter) */
  async getActions(storeId: string, status?: string, limit = 50): Promise<AutonomousActionRow[]> {
    let query = supabase
      .from('autonomous_actions')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('approval_status', status);
    const { data } = await query;
    return (data || []) as AutonomousActionRow[];
  }

  /** Approve a pending action */
  async approveAction(actionId: string, userId?: string): Promise<boolean> {
    const { error } = await supabase
      .from('autonomous_actions')
      .update({
        approval_status: 'approved',
        approved_by: userId || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', actionId);

    return !error;
  }

  /** Reject a pending action */
  async rejectAction(actionId: string, userId?: string): Promise<boolean> {
    const { error } = await supabase
      .from('autonomous_actions')
      .update({
        approval_status: 'rejected',
        approved_by: userId || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', actionId);

    return !error;
  }

  /** Get autonomous mode summary stats */
  async getSummary(storeId: string): Promise<{
    isEnabled: boolean;
    totalActionsToday: number;
    autoApprovedToday: number;
    pendingApproval: number;
    rejectedToday: number;
    savingsEstimate: number;
  }> {
    try {
      const config = await this.getConfig(storeId);
      const today = new Date().toISOString().split('T')[0];

      const { data: todayActions } = await supabase
        .from('autonomous_actions')
        .select('approval_status')
        .eq('store_id', storeId)
        .gte('created_at', `${today}T00:00:00`);

      const actions = todayActions || [];
      const pending = await this.getPendingActions(storeId);

      return {
        isEnabled: Boolean(config?.is_enabled),
        totalActionsToday: actions.length,
        autoApprovedToday: actions.filter((a: any) => a.approval_status === 'auto_approved').length,
        pendingApproval: pending.length,
        rejectedToday: actions.filter((a: any) => a.approval_status === 'rejected').length,
        savingsEstimate: actions.length * 5, // ~5 min saved per auto-action
      };
    } catch (err) {
      console.error('getSummary error:', err);
      return {
        isEnabled: false,
        totalActionsToday: 0,
        autoApprovedToday: 0,
        pendingApproval: 0,
        rejectedToday: 0,
        savingsEstimate: 0,
      };
    }
  }
}

export const autonomousEngine = new AutonomousEngine();
