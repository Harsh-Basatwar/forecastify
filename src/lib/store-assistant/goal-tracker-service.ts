/* eslint-disable @typescript-eslint/no-explicit-any */
/** GoalTrackerService — Owner Goal Setting with AI Coaching */
import { createClient } from '@supabase/supabase-js';
import type { StoreGoalRow } from './types';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export class GoalTrackerService {
  async createGoal(storeId: string, goal: Partial<StoreGoalRow>): Promise<StoreGoalRow | null> {
    const { data, error } = await supabase.from('store_goals').insert({ store_id: storeId, ...goal }).select().single();
    if (error) return null;
    return data as StoreGoalRow;
  }

  async getGoals(storeId: string, status?: string): Promise<StoreGoalRow[]> {
    let query = supabase.from('store_goals').select('*').eq('store_id', storeId).order('target_date', { ascending: true });
    if (status) query = query.eq('status', status);
    const { data } = await query.limit(20);
    return (data || []) as StoreGoalRow[];
  }

  async updateProgress(storeId: string): Promise<number> {
    const goals = await this.getGoals(storeId, 'active');
    let updated = 0;

    for (const goal of goals) {
      let currentValue = 0;
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      if (goal.goal_type === 'revenue' || goal.goal_type === 'profit') {
        const { data } = await supabase.from('sales').select('grand_total').eq('store_id', storeId).eq('status', 'completed').gte('created_at', monthStart);
        currentValue = (data || []).reduce((s: number, r: any) => s + Number(r.grand_total || 0), 0);
      } else if (goal.goal_type === 'customers') {
        const { count } = await supabase.from('customers').select('id', { count: 'exact' }).eq('store_id', storeId);
        currentValue = count || 0;
      }

      const progress = goal.target_value > 0 ? Math.min(100, Math.round((currentValue / goal.target_value) * 100)) : 0;
      const daysRemaining = Math.ceil((new Date(goal.target_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const expectedProgress = Math.round(((30 - Math.max(0, daysRemaining)) / 30) * 100);

      let status: string = 'active';
      if (progress >= 100) status = 'achieved';
      else if (daysRemaining <= 0) status = 'missed';
      else if (progress >= expectedProgress - 10) status = 'on_track';
      else status = 'at_risk';

      const coaching = this.generateCoaching(goal, currentValue, progress, daysRemaining);

      await supabase.from('store_goals').update({
        current_value: currentValue,
        progress_pct: progress,
        status,
        daily_coaching: [...(goal.daily_coaching || []).slice(-6), { date: now.toISOString().split('T')[0], advice: coaching, actionsTaken: [] }],
      }).eq('id', goal.id);
      updated++;
    }
    return updated;
  }

  private generateCoaching(goal: StoreGoalRow, current: number, progress: number, daysLeft: number): string {
    if (progress >= 100) return `Congratulations! Goal "${goal.title}" achieved!`;
    if (progress >= 80) return `Almost there! ${100 - progress}% left for "${goal.title}". Keep pushing.`;
    if (daysLeft <= 5) return `Urgent: Only ${daysLeft} days left for "${goal.title}". Focus all efforts.`;
    return `Progress: ${progress}% towards "${goal.title}". Need ₹${Math.round(goal.target_value - current).toLocaleString('en-IN')} more in ${daysLeft} days.`;
  }

  async deleteGoal(goalId: string): Promise<void> {
    await supabase.from('store_goals').delete().eq('id', goalId);
  }
}
export const goalTrackerService = new GoalTrackerService();
