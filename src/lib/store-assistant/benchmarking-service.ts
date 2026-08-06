/* eslint-disable @typescript-eslint/no-explicit-any */
/** BenchmarkingService — Store Performance Comparison */
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export interface BenchmarkPeriod { label: string; revenue: number; profit: number; transactions: number; avgBasket: number; }
export interface BenchmarkResult { current: BenchmarkPeriod; previous: BenchmarkPeriod; lastYear: BenchmarkPeriod; deltas: { revenuePct: number; profitPct: number; txnPct: number; basketPct: number }; }

export class BenchmarkingService {
  async compare(storeId: string): Promise<BenchmarkResult> {
    const now = new Date();
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonthStart = now.getMonth() === 0 ? `${now.getFullYear() - 1}-12-01` : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-01`;
    const lastYearStart = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastYearEnd = `${now.getFullYear() - 1}-${String(now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2).padStart(2, '0')}-01`;

    const [current, previous, lastYear] = await Promise.all([
      this.getPeriod(storeId, thisMonthStart, now.toISOString(), 'This Month'),
      this.getPeriod(storeId, lastMonthStart, thisMonthStart, 'Last Month'),
      this.getPeriod(storeId, lastYearStart, lastYearEnd, 'Same Month Last Year'),
    ]);

    return {
      current, previous, lastYear,
      deltas: {
        revenuePct: previous.revenue > 0 ? Math.round(((current.revenue - previous.revenue) / previous.revenue) * 100) : 0,
        profitPct: previous.profit > 0 ? Math.round(((current.profit - previous.profit) / previous.profit) * 100) : 0,
        txnPct: previous.transactions > 0 ? Math.round(((current.transactions - previous.transactions) / previous.transactions) * 100) : 0,
        basketPct: previous.avgBasket > 0 ? Math.round(((current.avgBasket - previous.avgBasket) / previous.avgBasket) * 100) : 0,
      },
    };
  }

  private async getPeriod(storeId: string, start: string, end: string, label: string): Promise<BenchmarkPeriod> {
    const { data } = await supabase.from('sales').select('grand_total, subtotal').eq('store_id', storeId).eq('status', 'completed').gte('created_at', start).lt('created_at', end);
    const sales = data || [];
    const revenue = sales.reduce((s: number, r: any) => s + Number(r.grand_total || 0), 0);
    return { label, revenue: Math.round(revenue), profit: Math.round(revenue * 0.25), transactions: sales.length, avgBasket: sales.length > 0 ? Math.round(revenue / sales.length) : 0 };
  }
}
export const benchmarkingService = new BenchmarkingService();
