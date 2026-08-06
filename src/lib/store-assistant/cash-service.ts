/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CashService — Cash Flow Intelligence & Predictions
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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

  async getIntelligence(storeId: string): Promise<CashIntelligence> {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Today's sales by payment method
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

    // Weekly average
    const { data: weekSales } = await supabase
      .from('sales')
      .select('grand_total, payment_method')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', `${weekAgo}T00:00:00`);

    const wSales = weekSales || [];
    const weekCash = wSales.filter((s: any) => s.payment_method === 'cash').reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const weekUPI = wSales.filter((s: any) => s.payment_method === 'upi' || s.payment_method === 'online').reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);

    // Outstanding khata collections
    const { data: khataData } = await supabase
      .from('khata_accounts')
      .select('outstanding_balance')
      .eq('store_id', storeId)
      .eq('is_deleted', false)
      .gt('outstanding_balance', 0);

    const outstanding = (khataData || []).reduce((sum: number, a: any) => sum + Number(a.outstanding_balance || 0), 0);

    // Daily expenses (from expenses table)
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

    // Recommended bank deposit: keep 2 days of cash requirement, deposit rest
    const cashToKeep = Math.round(weeklyAvgCash * 2);
    const recommendedDeposit = Math.max(0, todayCash - cashToKeep);

    // Change denomination estimate
    const denominations = this.estimateChangeDenominations(predictedTomorrowCash);

    // Cash runway (how many days current cash + expected collections cover expenses)
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

  private estimateChangeDenominations(dailyCash: number): { denomination: number; count: number }[] {
    // Approximate change needs based on daily cash volume
    const txnCount = Math.ceil(dailyCash / 200); // avg ₹200/txn
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
