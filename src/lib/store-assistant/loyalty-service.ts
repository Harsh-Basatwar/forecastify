/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * LoyaltyService — Customer Segmentation & Loyalty AI
 */

import { createClient } from '@supabase/supabase-js';
import type { LoyaltySegmentRow, LoyaltySegment, LoyaltyAction } from './types';
import { LOYALTY_THRESHOLDS } from './constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export class LoyaltyService {

  /** Get all loyalty segments for a store */
  async getSegments(storeId: string): Promise<LoyaltySegmentRow[]> {
    const { data } = await supabase
      .from('loyalty_segments')
      .select('*, customers(name, phone)')
      .eq('store_id', storeId)
      .order('loyalty_score', { ascending: false });

    return (data || []).map((s: any) => ({
      ...s,
      customer_name: s.customers?.name,
      customer_phone: s.customers?.phone,
    })) as LoyaltySegmentRow[];
  }

  /** Get segment distribution */
  async getDistribution(storeId: string): Promise<Record<LoyaltySegment, number>> {
    const segments = await this.getSegments(storeId);
    const dist: Record<string, number> = { vip: 0, frequent: 0, seasonal: 0, regular: 0, inactive: 0, lost: 0 };
    for (const s of segments) dist[s.segment] = (dist[s.segment] || 0) + 1;
    return dist as Record<LoyaltySegment, number>;
  }

  /** Re-segment all customers (run weekly) */
  async resegmentAll(storeId: string): Promise<number> {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name')
      .eq('store_id', storeId);

    if (!customers || customers.length === 0) return 0;

    let updated = 0;
    for (const customer of customers) {
      const segment = await this.computeSegment(storeId, customer.id);
      if (segment) {
        await supabase
          .from('loyalty_segments')
          .upsert({
            store_id: storeId,
            customer_id: customer.id,
            segment: segment.segment,
            loyalty_score: segment.score,
            total_lifetime_value: segment.ltv,
            visit_frequency_days: segment.freqDays,
            last_visit_date: segment.lastVisit,
            recommended_actions: segment.actions,
          }, { onConflict: 'store_id,customer_id' });
        updated++;
      }
    }
    return updated;
  }

  /** Compute segment for a single customer */
  private async computeSegment(storeId: string, customerId: string): Promise<{
    segment: LoyaltySegment; score: number; ltv: number; freqDays: number; lastVisit: string | null; actions: LoyaltyAction[];
  } | null> {
    // Get customer sales
    const { data: sales } = await supabase
      .from('sales')
      .select('grand_total, created_at')
      .eq('store_id', storeId)
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!sales || sales.length === 0) {
      return { segment: 'lost', score: 0, ltv: 0, freqDays: 999, lastVisit: null, actions: [{ type: 'reactivation', description: 'Send welcome-back offer with 10% discount', expectedImpact: 'Re-engage customer' }] };
    }

    const ltv = sales.reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    const lastVisit = sales[0].created_at;
    const daysSinceLast = Math.ceil((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24));

    // Visit frequency
    let freqDays = 30;
    if (sales.length > 1) {
      const firstVisit = new Date(sales[sales.length - 1].created_at);
      const lastVisitDate = new Date(sales[0].created_at);
      const spanDays = Math.max(1, Math.ceil((lastVisitDate.getTime() - firstVisit.getTime()) / (1000 * 60 * 60 * 24)));
      freqDays = Math.round(spanDays / sales.length);
    }

    // Determine segment
    let segment: LoyaltySegment;
    let score: number;
    const actions: LoyaltyAction[] = [];

    if (daysSinceLast >= LOYALTY_THRESHOLDS.lost.daysSinceLastVisit) {
      segment = 'lost';
      score = 10;
      actions.push({ type: 'reactivation', description: 'Send "We miss you" message with special offer', expectedImpact: '15% reactivation rate' });
    } else if (daysSinceLast >= LOYALTY_THRESHOLDS.inactive.daysSinceLastVisit) {
      segment = 'inactive';
      score = 25;
      actions.push({ type: 'coupon', description: 'Send discount coupon to re-engage', expectedImpact: '25% return rate' });
    } else if (freqDays <= 3 && ltv > 5000) {
      segment = 'vip';
      score = 95;
      actions.push({ type: 'reward', description: 'Send exclusive VIP offer', expectedImpact: 'Retain high-value customer' });
    } else if (freqDays <= 7) {
      segment = 'frequent';
      score = 75;
      actions.push({ type: 'bundle', description: 'Suggest bundle deals on frequently purchased items', expectedImpact: 'Increase basket size 15%' });
    } else {
      segment = 'regular';
      score = 50;
      actions.push({ type: 'discount', description: 'Offer category discount to increase visit frequency', expectedImpact: 'Improve frequency by 20%' });
    }

    return { segment, score, ltv, freqDays, lastVisit, actions };
  }

  /** Get recommended actions for a segment */
  getSegmentActions(segment: LoyaltySegment): LoyaltyAction[] {
    const actionMap: Record<LoyaltySegment, LoyaltyAction[]> = {
      vip: [{ type: 'reward', description: 'Exclusive loyalty reward & early access', expectedImpact: 'Retain top customer' }],
      frequent: [{ type: 'bundle', description: 'Bundle deals on regular purchases', expectedImpact: 'Increase basket 15%' }],
      seasonal: [{ type: 'coupon', description: 'Seasonal offer during peak months', expectedImpact: 'Capture seasonal spend' }],
      regular: [{ type: 'discount', description: 'Category discount to boost visits', expectedImpact: 'Increase frequency 20%' }],
      inactive: [{ type: 'coupon', description: 'Win-back coupon with 15% off', expectedImpact: '25% return rate' }],
      lost: [{ type: 'reactivation', description: 'Re-engagement message + special offer', expectedImpact: '10% reactivation' }],
    };
    return actionMap[segment] || [];
  }
}

export const loyaltyService = new LoyaltyService();
