/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CashService — Cash Flow Intelligence, Predictions & Evening Reconciliation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const defaultSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);
const supabase = defaultSupabase;

export interface DenominationBreakdown {
  d500?: number;
  d200?: number;
  d100?: number;
  d50?: number;
  d20?: number;
  d10?: number;
  coins?: number;
}

export interface ReconciliationResult {
  expectedCash: number;
  actualCash: number;
  difference: number; // Positive = excess, Negative = shortage
  status: 'matched' | 'shortage' | 'excess';
  upiTotal: number;
  cardTotal: number;
  walletTotal: number;
  grandTotalSales: number;
  recommendation: string;
  reconciledAt: string;
}

export interface CashIntelligence {
  todayCash: number;
  todayUPI: number;
  todayTotal: number;
  cashPct: number;
  upiPct: number;
  weeklyAvgCash: number;
  weeklyAvgUPI: number;
  predictedTomorrowCash: number;
  outstandingCollections: number;
  recommendedBankDeposit: number;
  changeDenominations: { denomination: number; count: number }[];
  cashRunwayDays: number;
}

export class CashService {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || defaultSupabase;
  }

  async getIntelligence(storeId: string): Promise<CashIntelligence> {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: todaySales } = await supabase
      .from('sales')
      .select('grand_total, payment_method')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', `${today}T00:00:00`);

    const sales = todaySales || [];
    const todayCash = sales.filter((s: any) => s.payment_method === 'cash').reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const todayUPI = sales.filter((s: any) => s.payment_method === 'upi' || s.payment_method === 'online').reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const todayTotal = todayCash + todayUPI;

    const { data: weekSales } = await supabase
      .from('sales')
      .select('grand_total, payment_method')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', `${weekAgo}T00:00:00`);

    const wSales = weekSales || [];
    const weekCash = wSales.filter((s: any) => s.payment_method === 'cash').reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const weekUPI = wSales.filter((s: any) => s.payment_method === 'upi' || s.payment_method === 'online').reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);

    const { data: khataData } = await supabase
      .from('khata_accounts')
      .select('outstanding_balance')
      .eq('store_id', storeId)
      .eq('is_deleted', false)
      .gt('outstanding_balance', 0);

    const outstanding = (khataData || []).reduce((sum: number, a: any) => sum + Number(a.outstanding_balance || 0), 0);

    const { data: expenseData } = await supabase
      .from('expenses')
      .select('amount')
      .eq('store_id', storeId)
      .gte('expense_date', weekAgo);

    const weeklyExpenses = (expenseData || []).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const dailyExpenseAvg = weeklyExpenses / 7;

    const weeklyAvgCash = Math.round(weekCash / 7);
    const weeklyAvgUPI = Math.round(weekUPI / 7);
    const predictedTomorrowCash = weeklyAvgCash;

    const cashToKeep = Math.round(weeklyAvgCash * 2);
    const recommendedDeposit = Math.max(0, todayCash - cashToKeep);

    const denominations = this.estimateChangeDenominations(predictedTomorrowCash);
    const cashRunway = dailyExpenseAvg > 0 ? Math.round((todayCash + outstanding * 0.3) / dailyExpenseAvg) : 30;

    return {
      todayCash,
      todayUPI,
      todayTotal,
      cashPct: todayTotal > 0 ? Math.round((todayCash / todayTotal) * 100) : 0,
      upiPct: todayTotal > 0 ? Math.round((todayUPI / todayTotal) * 100) : 0,
      weeklyAvgCash,
      weeklyAvgUPI,
      predictedTomorrowCash,
      outstandingCollections: outstanding,
      recommendedBankDeposit: recommendedDeposit,
      changeDenominations: denominations,
      cashRunwayDays: cashRunway,
    };
  }

  /** Calculate actual total from physical denomination count */
  calculateDenominationTotal(counts: DenominationBreakdown): number {
    return (
      (counts.d500 || 0) * 500 +
      (counts.d200 || 0) * 200 +
      (counts.d100 || 0) * 100 +
      (counts.d50 || 0) * 50 +
      (counts.d20 || 0) * 20 +
      (counts.d10 || 0) * 10 +
      (counts.coins || 0) * 1
    );
  }

  /** Run Evening Cash Drawer Reconciliation */
  async reconcileDrawer(
    storeId: string,
    denominations: DenominationBreakdown,
    openingFloat = 2000
  ): Promise<ReconciliationResult> {
    const today = new Date().toISOString().split('T')[0];

    const { data: sales } = await supabase
      .from('sales')
      .select('grand_total, payment_method')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', `${today}T00:00:00`);

    const salesList = sales || [];
    const posCash = salesList.filter((s: any) => s.payment_method === 'cash').reduce((s: number, i: any) => s + Number(i.grand_total || 0), 0);
    const upiTotal = salesList.filter((s: any) => s.payment_method === 'upi' || s.payment_method === 'online').reduce((s: number, i: any) => s + Number(i.grand_total || 0), 0);
    const cardTotal = salesList.filter((s: any) => s.payment_method === 'card').reduce((s: number, i: any) => s + Number(i.grand_total || 0), 0);
    const walletTotal = salesList.filter((s: any) => s.payment_method === 'wallet').reduce((s: number, i: any) => s + Number(i.grand_total || 0), 0);

    const expectedCash = posCash + openingFloat;
    const actualCash = this.calculateDenominationTotal(denominations);
    const difference = actualCash - expectedCash;

    let status: 'matched' | 'shortage' | 'excess' = 'matched';
    let recommendation = 'Cash drawer matches expected balance perfectly. Store ready for close.';

    if (difference < -50) {
      status = 'shortage';
      recommendation = `Cash shortage of ₹${Math.abs(difference)}. Verify void sales, unrecorded payouts, or shift log errors.`;
    } else if (difference > 50) {
      status = 'excess';
      recommendation = `Cash excess of ₹${difference}. Verify unrecorded cash sales or customer change overpayments.`;
    }

    const result: ReconciliationResult = {
      expectedCash,
      actualCash,
      difference,
      status,
      upiTotal,
      cardTotal,
      walletTotal,
      grandTotalSales: posCash + upiTotal + cardTotal + walletTotal,
      recommendation,
      reconciledAt: new Date().toISOString(),
    };

    await supabase.from('activity_logs').insert({
      user_id: storeId,
      activity_title: `Cash Reconciliation (${status.toUpperCase()})`,
      activity_type: 'cash_reconciliation',
      metadata: result,
    });

    return result;
  }

  private estimateChangeDenominations(dailyCash: number): { denomination: number; count: number }[] {
    const txnCount = Math.ceil(dailyCash / 200);
    return [
      { denomination: 10, count: Math.ceil(txnCount * 0.5) },
      { denomination: 20, count: Math.ceil(txnCount * 0.4) },
      { denomination: 50, count: Math.ceil(txnCount * 0.3) },
      { denomination: 100, count: Math.ceil(txnCount * 0.3) },
      { denomination: 500, count: Math.ceil(txnCount * 0.1) },
    ];
  }
}

export const cashService = new CashService();
