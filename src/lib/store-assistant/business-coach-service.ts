/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * BusinessCoachService — AI-Powered Daily Business Advice
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface CoachingAdvice {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  advice: string;
  impact: string;
  category: 'revenue' | 'cost' | 'inventory' | 'customer' | 'operations';
  actionable: boolean;
  actions: string[];
}

export class BusinessCoachService {

  /** Generate daily coaching advice */
  async getDailyAdvice(storeId: string): Promise<CoachingAdvice[]> {
    const advice: CoachingAdvice[] = [];

    // Parallel data fetching
    const [deadInv, expiry, khata, lowStock, health] = await Promise.all([
      this.getDeadInventoryInsight(storeId),
      this.getExpiryInsight(storeId),
      this.getKhataInsight(storeId),
      this.getLowStockInsight(storeId),
      this.getHealthInsight(storeId),
    ]);

    if (deadInv) advice.push(deadInv);
    if (expiry) advice.push(expiry);
    if (khata) advice.push(khata);
    if (lowStock) advice.push(lowStock);
    if (health) advice.push(health);

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    advice.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return advice.slice(0, 5); // Top 5 daily
  }

  /** Ask the coach a specific question */
  async askQuestion(storeId: string, question: string): Promise<string> {
    // In production, this would use Groq/OpenAI to answer based on store data
    // For now, provide structured responses based on keywords
    const q = question.toLowerCase();

    if (q.includes('profit') || q.includes('revenue')) {
      const { data: sales } = await supabase
        .from('sales')
        .select('grand_total')
        .eq('store_id', storeId)
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const weekRevenue = (sales || []).reduce((s: number, r: any) => s + Number(r.grand_total || 0), 0);
      return `Your weekly revenue is ₹${weekRevenue.toLocaleString('en-IN')}. Focus on reducing dead inventory and collecting outstanding credit to improve profit margins.`;
    }

    if (q.includes('cost') || q.includes('expense') || q.includes('save')) {
      return 'Review your top 3 expense categories. Negotiate bulk rates with suppliers and consider LED lighting to cut electricity costs. Check the Expense Monitor for detailed breakdown.';
    }

    if (q.includes('customer') || q.includes('loyalty')) {
      return 'Check Customer Loyalty page for segment analysis. Focus on reactivating inactive customers with targeted offers — they already know your store.';
    }

    return 'I analyze your store data to provide actionable advice. Try asking about profit, expenses, customers, inventory, or suppliers.';
  }

  // ── Private Insight Generators ─────────────────────────────

  private async getDeadInventoryInsight(storeId: string): Promise<CoachingAdvice | null> {
    const { data } = await supabase
      .from('inventory')
      .select('id, product_name, current_stock:quantity, price')
      .eq('store_id', storeId)
      .gt('current_stock', 0);

    if (!data || data.length === 0) return null;

    // Simplified: estimate dead inventory value
    const totalValue = data.reduce((s: number, i: any) => s + Number(i.current_stock) * Number(i.price), 0);
    const estimatedDead = Math.round(totalValue * 0.15); // Assume 15% is slow/dead

    if (estimatedDead < 1000) return null;

    return {
      id: 'dead-inv',
      priority: estimatedDead > 10000 ? 'high' : 'medium',
      title: `₹${estimatedDead.toLocaleString('en-IN')} blocked in slow-moving inventory`,
      advice: 'Clear dead inventory to free up working capital. Bundle slow items with fast movers or offer clearance discounts.',
      impact: `Free up ₹${estimatedDead.toLocaleString('en-IN')} in blocked capital`,
      category: 'inventory',
      actionable: true,
      actions: ['Open Dead Inventory page', 'Apply bulk clearance discounts', 'Create bundle offers'],
    };
  }

  private async getExpiryInsight(storeId: string): Promise<CoachingAdvice | null> {
    const { data } = await supabase
      .from('inventory')
      .select('id, product_name, current_stock:quantity, price, expiry_date')
      .eq('store_id', storeId)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .gt('current_stock', 0);

    if (!data || data.length === 0) return null;

    const totalValue = data.reduce((s: number, i: any) => s + Number(i.current_stock) * Number(i.price), 0);

    return {
      id: 'expiry',
      priority: data.length > 5 ? 'critical' : 'high',
      title: `${data.length} items expiring within 7 days (₹${totalValue.toLocaleString('en-IN')} at risk)`,
      advice: 'Apply discounts or bundle with popular items to recover value before expiry.',
      impact: `Recover up to ₹${Math.round(totalValue * 0.6).toLocaleString('en-IN')} with clearance pricing`,
      category: 'inventory',
      actionable: true,
      actions: ['Open Expiry Assistant', 'Apply 30% clearance discount', 'Return eligible items to supplier'],
    };
  }

  private async getKhataInsight(storeId: string): Promise<CoachingAdvice | null> {
    const { data } = await supabase
      .from('khata_accounts')
      .select('outstanding_balance, status')
      .eq('store_id', storeId)
      .eq('is_deleted', false)
      .gt('outstanding_balance', 0);

    if (!data || data.length === 0) return null;

    const total = data.reduce((s: number, a: any) => s + Number(a.outstanding_balance || 0), 0);
    const overdue = data.filter((a: any) => a.status === 'overdue').length;

    if (total < 500) return null;

    return {
      id: 'khata',
      priority: overdue > 3 ? 'high' : 'medium',
      title: `₹${total.toLocaleString('en-IN')} outstanding credit across ${data.length} customers`,
      advice: overdue > 0 ? `${overdue} accounts are overdue. Send reminders today.` : 'Send friendly payment reminders to improve cash flow.',
      impact: `Collect up to ₹${total.toLocaleString('en-IN')} in outstanding credit`,
      category: 'revenue',
      actionable: true,
      actions: ['Open Smart Khata', 'Send WhatsApp reminders', 'Review overdue accounts'],
    };
  }

  private async getLowStockInsight(storeId: string): Promise<CoachingAdvice | null> {
    const { data } = await supabase
      .from('inventory')
      .select('id')
      .eq('store_id', storeId)
      .lte('current_stock', 0);

    if (!data || data.length < 3) return null;

    return {
      id: 'stockouts',
      priority: data.length > 10 ? 'critical' : 'high',
      title: `${data.length} products are out of stock`,
      advice: 'Generate purchase orders immediately to prevent revenue loss from stockouts.',
      impact: 'Prevent estimated daily revenue loss',
      category: 'revenue',
      actionable: true,
      actions: ['Open Purchase Automation', 'Generate smart purchase orders', 'Contact suppliers'],
    };
  }

  private async getHealthInsight(storeId: string): Promise<CoachingAdvice | null> {
    const { data } = await supabase
      .from('store_health_snapshots')
      .select('overall_score, trend, recommendations')
      .eq('store_id', storeId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    if (data.overall_score >= 80) return null; // Healthy store

    return {
      id: 'health',
      priority: data.overall_score < 50 ? 'critical' : 'medium',
      title: `Store health score: ${data.overall_score}/100 (${data.trend})`,
      advice: data.recommendations?.[0] || 'Review Store Health dashboard for detailed breakdown.',
      impact: 'Improve overall store efficiency',
      category: 'operations',
      actionable: true,
      actions: ['Open Store Health', 'Address lowest-scoring dimensions'],
    };
  }
}

export const businessCoachService = new BusinessCoachService();
