/* eslint-disable @typescript-eslint/no-explicit-any */
/** ExpenseService — Expense Tracking & Budget Analysis */
import { createClient } from '@supabase/supabase-js';
import type { ExpenseRow } from './types';
import { EXPENSE_CATEGORIES } from './constants';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export class ExpenseService {
  async createExpense(storeId: string, expense: Partial<ExpenseRow>): Promise<ExpenseRow | null> {
    const { data, error } = await supabase.from('expenses').insert({ store_id: storeId, ...expense }).select().single();
    if (error) return null;
    return data as ExpenseRow;
  }

  async getExpenses(storeId: string, month?: number, year?: number): Promise<ExpenseRow[]> {
    let query = supabase.from('expenses').select('*').eq('store_id', storeId).order('expense_date', { ascending: false });
    if (month && year) {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
      query = query.gte('expense_date', start).lt('expense_date', end);
    }
    const { data } = await query.limit(200);
    return (data || []) as ExpenseRow[];
  }

  async getMonthlyBreakdown(storeId: string, month?: number, year?: number): Promise<{ type: string; label: string; amount: number; budget: number; variance: number; trend: string }[]> {
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();
    const expenses = await this.getExpenses(storeId, m, y);

    const byType = new Map<string, number>();
    for (const e of expenses) byType.set(e.expense_type, (byType.get(e.expense_type) || 0) + e.amount);

    return EXPENSE_CATEGORIES.map(cat => {
      const amount = byType.get(cat.type) || 0;
      const budget = (cat.typicalRange.min + cat.typicalRange.max) / 2;
      return { type: cat.type, label: cat.label, amount, budget: Math.round(budget), variance: Math.round(amount - budget), trend: amount > budget ? 'over' : amount < budget * 0.8 ? 'under' : 'on_track' };
    });
  }

  async getSavingsOpportunities(storeId: string): Promise<{ category: string; suggestion: string; savingEstimate: number }[]> {
    const breakdown = await this.getMonthlyBreakdown(storeId);
    return breakdown.filter(b => b.trend === 'over').map(b => ({
      category: b.label,
      suggestion: `${b.label} is ₹${Math.abs(b.variance).toLocaleString('en-IN')} over budget. Review and optimize.`,
      savingEstimate: Math.abs(b.variance),
    }));
  }

  async getTotal(storeId: string, month?: number, year?: number): Promise<number> {
    const expenses = await this.getExpenses(storeId, month, year);
    return expenses.reduce((s, e) => s + e.amount, 0);
  }

  async deleteExpense(expenseId: string): Promise<void> {
    await supabase.from('expenses').delete().eq('id', expenseId);
  }
}
export const expenseService = new ExpenseService();
