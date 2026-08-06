/* eslint-disable @typescript-eslint/no-explicit-any */
/** NegotiationService — AI Supplier Negotiation Insights */
import { createClient } from '@supabase/supabase-js';
import type { NegotiationInsightRow } from './types';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

export class NegotiationService {
  async getInsights(storeId: string, supplierId?: string): Promise<NegotiationInsightRow[]> {
    let query = supabase.from('negotiation_insights').select('*, suppliers(name, company_name)').eq('store_id', storeId).order('confidence', { ascending: false });
    if (supplierId) query = query.eq('supplier_id', supplierId);
    const { data } = await query.limit(50);
    return (data || []).map((i: any) => ({ ...i, supplier_name: i.suppliers?.name || i.suppliers?.company_name })) as NegotiationInsightRow[];
  }

  async generateInsights(storeId: string): Promise<number> {
    const { data: suppliers } = await supabase.from('suppliers').select('id, name, company_name, payment_terms').eq('store_id', storeId);
    if (!suppliers || suppliers.length === 0) return 0;

    let count = 0;
    for (const sup of suppliers) {
      const { data: pos } = await supabase.from('purchase_orders').select('total_amount, created_at, status')
        .eq('store_id', storeId).eq('supplier_id', sup.id).eq('status', 'delivered').order('created_at', { ascending: false }).limit(20);

      if (!pos || pos.length < 3) continue;
      const amounts = pos.map((p: any) => Number(p.total_amount));
      const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;

      // Detect discount patterns
      const priceDeclines = amounts.slice(0, -1).filter((a, i) => amounts[i + 1] < a).length;
      if (priceDeclines > amounts.length * 0.3) {
        await this.saveInsight(storeId, sup.id, 'discount_pattern', `${sup.name || sup.company_name} tends to accept discounts on orders above ₹${Math.round(avgAmount * 1.2).toLocaleString('en-IN')}`, 0.75);
        count++;
      }

      // Day-of-week patterns
      const dayCount = new Map<number, number>();
      for (const po of pos) { const d = new Date(po.created_at).getDay(); dayCount.set(d, (dayCount.get(d) || 0) + 1); }
      const bestDay = [...dayCount.entries()].sort((a, b) => b[1] - a[1])[0];
      if (bestDay && bestDay[1] > 2) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        await this.saveInsight(storeId, sup.id, 'best_time', `Best ordering day for ${sup.name || sup.company_name}: ${days[bestDay[0]]}`, 0.65);
        count++;
      }

      // Bulk threshold
      if (avgAmount > 10000) {
        await this.saveInsight(storeId, sup.id, 'bulk_threshold', `Orders above ₹${Math.round(avgAmount * 1.5).toLocaleString('en-IN')} may qualify for bulk discount`, 0.60);
        count++;
      }
    }
    return count;
  }

  /** Generate AI Negotiation Draft & Savings Estimate */
  async generateNegotiationDraft(storeId: string, supplierId: string): Promise<{ draft: string; estimatedSavingsPct: number; estimatedSavingsAmount: number }> {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name, company_name, payment_terms, reliability_score')
      .eq('id', supplierId)
      .single();

    const { data: pos } = await supabase
      .from('purchase_orders')
      .select('total_amount')
      .eq('store_id', storeId)
      .eq('supplier_id', supplierId)
      .eq('status', 'delivered');

    const totalSpent = (pos || []).reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0);
    const supName = supplier?.name || supplier?.company_name || 'Vendor';

    const draft = `Subject: Proposal for Annual Volume Tier & Terms Adjustment — ${supName}

Dear ${supName} Team,

We appreciate our ongoing partnership with ${supName}. Over the past evaluation period, our store has placed orders totaling ₹${totalSpent.toLocaleString('en-IN')}.

Based on our projected demand growth, we are looking to consolidate more of our weekly category orders with ${supName}. To support this expansion, we request:
1. A 5% volume rebate on monthly orders exceeding ₹50,000.
2. Extension of payment terms to Net-30 days.

We value your reliability and look forward to confirming our next order cycle.

Best regards,
Store Management`;

    const estimatedSavingsPct = 5;
    const estimatedSavingsAmount = Math.round(totalSpent * 0.05);

    return { draft, estimatedSavingsPct, estimatedSavingsAmount };
  }

  private async saveInsight(storeId: string, supplierId: string, type: string, text: string, confidence: number) {
    await supabase.from('negotiation_insights').upsert({
      store_id: storeId, supplier_id: supplierId, insight_type: type, insight_text: text, confidence, last_validated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  }
}
export const negotiationService = new NegotiationService();

