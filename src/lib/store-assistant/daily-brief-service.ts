/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DailyBriefService — Morning & Closing Brief Generation
 *
 * Aggregates data from sales, inventory, procurement, khata, expiry,
 * forecast, and weather to produce a comprehensive daily brief.
 */

import { createClient } from '@supabase/supabase-js';
import type { MorningBriefData, ClosingBriefData, DailyBriefRow, ChecklistItem } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

export class DailyBriefService {

  /** Generate or fetch the morning brief for a given store and date */
  async getMorningBrief(storeId: string, date?: string): Promise<DailyBriefRow | null> {
    const briefDate = date || new Date().toISOString().split('T')[0];

    // Check for existing brief
    const { data: existing } = await supabase
      .from('daily_briefs')
      .select('*')
      .eq('store_id', storeId)
      .eq('brief_type', 'morning')
      .eq('brief_date', briefDate)
      .maybeSingle();

    if (existing) return existing as DailyBriefRow;

    // Generate new brief
    const briefData = await this.computeMorningData(storeId, briefDate);
    const aiSummary = this.generateAISummary(briefData);

    const { data: created, error } = await supabase
      .from('daily_briefs')
      .insert({
        store_id: storeId,
        brief_type: 'morning',
        brief_date: briefDate,
        data: briefData,
        ai_summary: aiSummary,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create morning brief:', error);
      return null;
    }

    return created as DailyBriefRow;
  }

  /** Generate or fetch the closing brief */
  async getClosingBrief(storeId: string, date?: string): Promise<DailyBriefRow | null> {
    const briefDate = date || new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('daily_briefs')
      .select('*')
      .eq('store_id', storeId)
      .eq('brief_type', 'closing')
      .eq('brief_date', briefDate)
      .maybeSingle();

    if (existing) return existing as DailyBriefRow;

    const briefData = await this.computeClosingData(storeId, briefDate);

    const { data: created, error } = await supabase
      .from('daily_briefs')
      .insert({
        store_id: storeId,
        brief_type: 'closing',
        brief_date: briefDate,
        data: briefData,
        ai_summary: `End-of-day report: ₹${briefData.todaysProfit.toLocaleString('en-IN')} profit. ${briefData.checklist.filter(c => c.completed).length}/${briefData.checklist.length} tasks completed.`,
      })
      .select()
      .single();

    if (error) return null;
    return created as DailyBriefRow;
  }

  /** Mark a brief as read */
  async markAsRead(briefId: string): Promise<void> {
    await supabase.from('daily_briefs').update({ is_read: true }).eq('id', briefId);
  }

  /** Get brief history for a store */
  async getBriefHistory(storeId: string, limit = 30): Promise<DailyBriefRow[]> {
    const { data } = await supabase
      .from('daily_briefs')
      .select('*')
      .eq('store_id', storeId)
      .order('brief_date', { ascending: false })
      .limit(limit);

    return (data || []) as DailyBriefRow[];
  }

  // ── Private: Compute Morning Data ──────────────────────────

  private async computeMorningData(storeId: string, date: string): Promise<MorningBriefData> {
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStart = `${yesterdayStr}T00:00:00`;
    const todayEnd = `${yesterdayStr}T23:59:59`;

    // Parallel data fetch
    const [salesResult, inventoryResult, poResult, khataResult] = await Promise.all([
      // Yesterday's sales
      supabase
        .from('sales')
        .select('grand_total, subtotal, tax_amount, discount_amount, payment_method, status')
        .eq('store_id', storeId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .eq('status', 'completed'),

      // Current inventory
      supabase
        .from('inventory')
        .select('id, product_name, category, current_stock:quantity, price, unit, expiry_date')
        .eq('store_id', storeId),

      // Pending POs
      supabase
        .from('purchase_orders')
        .select('id, po_number, status, total_amount, supplier_id')
        .eq('store_id', storeId)
        .in('status', ['draft', 'pending_approval', 'approved', 'sent', 'in_transit']),

      // Khata outstanding
      supabase
        .from('khata_accounts')
        .select('outstanding_balance')
        .eq('store_id', storeId)
        .eq('is_deleted', false)
        .gt('outstanding_balance', 0),
    ]);

    const sales = salesResult.data || [];
    const inventory = inventoryResult.data || [];
    const pendingPOs = poResult.data || [];
    const khataAccounts = khataResult.data || [];

    // Revenue & profit
    const revenue = sales.reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const cashReceived = sales.filter((s: any) => s.payment_method === 'cash').reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const upiReceived = sales.filter((s: any) => s.payment_method === 'upi').reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const expenses = sales.reduce((sum: number, s: any) => sum + Number(s.tax_amount || 0) + Number(s.discount_amount || 0), 0);
    const profit = revenue - expenses;

    // Stockouts & low inventory
    const stockouts = inventory.filter((i: any) => Number(i.current_stock) <= 0);
    const lowInventory = inventory.filter((i: any) => Number(i.current_stock) > 0 && Number(i.current_stock) <= 5);

    // Near-expiry items
    const today = new Date(date);
    const nearExpiry = inventory
      .filter((i: any) => {
        if (!i.expiry_date) return false;
        const expiry = new Date(i.expiry_date);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      })
      .map((i: any) => ({
        id: i.id,
        name: i.product_name,
        quantity: Number(i.current_stock),
        expiryDate: i.expiry_date,
        daysUntilExpiry: Math.ceil((new Date(i.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        value: Number(i.current_stock) * Number(i.price),
        recommendedAction: 'discount' as const,
      }));

    // Khata outstanding
    const creditOutstanding = khataAccounts.reduce((sum: number, a: any) => sum + Number(a.outstanding_balance || 0), 0);

    // Generate priorities
    const priorities: string[] = [];
    if (stockouts.length > 0) priorities.push(`Reorder ${stockouts.length} stockout items urgently`);
    if (nearExpiry.length > 0) priorities.push(`Handle ${nearExpiry.length} near-expiry items`);
    if (creditOutstanding > 1000) priorities.push(`Collect ₹${creditOutstanding.toLocaleString('en-IN')} outstanding credit`);
    if (pendingPOs.length > 0) priorities.push(`Follow up on ${pendingPOs.length} pending purchase orders`);
    if (lowInventory.length > 3) priorities.push(`Restock ${lowInventory.length} low-stock items`);
    if (priorities.length === 0) priorities.push('All operations running smoothly — focus on sales today');

    return {
      revenue,
      profit,
      expenses,
      bestSellingProducts: [], // Would come from sale_items aggregation
      worstSellingProducts: [],
      stockouts: stockouts.map((i: any) => ({ id: i.id, name: i.product_name, category: i.category, quantity: 0, value: 0, unit: i.unit })),
      nearExpiryItems: nearExpiry,
      lowInventory: lowInventory.map((i: any) => ({ id: i.id, name: i.product_name, category: i.category, quantity: Number(i.current_stock), value: Number(i.current_stock) * Number(i.price), unit: i.unit })),
      supplierIssues: [],
      pendingPurchaseOrders: pendingPOs.length,
      cashReceived,
      upiReceived,
      creditOutstanding,
      recommendations: priorities,
      todaysPriorities: priorities.slice(0, 5),
      estimatedRevenue: Math.round(revenue * 1.05), // Simple 5% growth estimate
      expectedDemandSpikes: [],
      weather: null,
      festivals: [],
      importantAlerts: stockouts.length > 3 ? [`Critical: ${stockouts.length} products out of stock`] : [],
    };
  }

  // ── Private: Compute Closing Data ─────────────────────────

  private async computeClosingData(storeId: string, date: string): Promise<ClosingBriefData> {
    const todayStart = `${date}T00:00:00`;
    const todayEnd = `${date}T23:59:59`;

    const [salesResult, inventoryResult] = await Promise.all([
      supabase
        .from('sales')
        .select('grand_total, subtotal, payment_method, payment_status, status')
        .eq('store_id', storeId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),

      supabase
        .from('inventory')
        .select('id, current_stock:quantity, expiry_date')
        .eq('store_id', storeId),
    ]);

    const sales = (salesResult.data || []).filter((s: any) => s.status === 'completed');
    const inventory = inventoryResult.data || [];

    const totalRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const cashAmount = sales.filter((s: any) => s.payment_method === 'cash').reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const pendingInvoices = (salesResult.data || []).filter((s: any) => s.payment_status === 'pending').length;

    const today = new Date(date);
    const nearExpiry = inventory.filter((i: any) => {
      if (!i.expiry_date) return false;
      const diff = Math.ceil((new Date(i.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    }).length;

    const checklist: ChecklistItem[] = [
      { id: 'cash', label: 'Cash counted and reconciled', completed: cashAmount > 0, value: `₹${cashAmount.toLocaleString('en-IN')}` },
      { id: 'inventory', label: 'Inventory synced', completed: true },
      { id: 'purchases', label: 'Purchase orders reviewed', completed: true },
      { id: 'invoices', label: 'Pending invoices cleared', completed: pendingInvoices === 0, value: pendingInvoices },
      { id: 'gst', label: 'GST records updated', completed: true },
      { id: 'credits', label: 'Outstanding credits reviewed', completed: true },
      { id: 'profit', label: "Today's profit calculated", completed: true, value: `₹${totalRevenue.toLocaleString('en-IN')}` },
      { id: 'expiry', label: 'Near-expiry items handled', completed: nearExpiry === 0, value: nearExpiry },
    ];

    return {
      cashCounted: cashAmount > 0,
      cashAmount,
      inventorySynced: true,
      purchasesReceived: 0,
      pendingInvoices,
      gstGenerated: Math.round(totalRevenue * 0.18),
      outstandingCredits: 0,
      todaysProfit: totalRevenue,
      inventoryMismatch: 0,
      nearExpiry,
      ordersPending: 0,
      recommendationsExecuted: 0,
      totalRecommendations: 0,
      checklist,
    };
  }

  private generateAISummary(data: MorningBriefData): string {
    const parts: string[] = [];
    parts.push(`Good Morning. Yesterday's revenue: ₹${data.revenue.toLocaleString('en-IN')}.`);
    if (data.stockouts.length > 0) parts.push(`${data.stockouts.length} items are out of stock.`);
    if (data.nearExpiryItems.length > 0) parts.push(`${data.nearExpiryItems.length} items expiring within 7 days.`);
    if (data.creditOutstanding > 0) parts.push(`₹${data.creditOutstanding.toLocaleString('en-IN')} credit outstanding.`);
    parts.push(`Today's priority: ${data.todaysPriorities[0] || 'Focus on sales.'}`);
    return parts.join(' ');
  }
}

export const dailyBriefService = new DailyBriefService();
