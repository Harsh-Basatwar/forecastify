/* eslint-disable @typescript-eslint/no-explicit-any */
/** LossPreventionService — Fraud, Theft & Cash Leak Detection */
import { createClient } from '@supabase/supabase-js';
import type { LossIncidentRow } from './types';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export class LossPreventionService {
  async scanForIncidents(storeId: string): Promise<LossIncidentRow[]> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const incidents: any[] = [];

    // 1. Void/cancellation abuse
    const { data: cancelled } = await supabase.from('sales').select('id, created_at, grand_total').eq('store_id', storeId).eq('status', 'cancelled').gte('created_at', weekAgo);
    if (cancelled && cancelled.length > 5) {
      const totalVoided = cancelled.reduce((s: number, c: any) => s + Number(c.grand_total || 0), 0);
      incidents.push({ store_id: storeId, incident_type: 'void_abuse', severity: cancelled.length > 10 ? 'high' : 'medium', description: `${cancelled.length} cancelled sales worth ₹${totalVoided.toLocaleString('en-IN')} in the past 7 days`, evidence: { count: cancelled.length, totalValue: totalVoided }, estimated_loss: totalVoided, status: 'open' });
    }

    // 2. Repeated high discounts
    const { data: discounted } = await supabase.from('sales').select('id, discount_amount, grand_total').eq('store_id', storeId).eq('status', 'completed').gte('created_at', weekAgo).gt('discount_amount', 0);
    const highDiscounts = (discounted || []).filter((s: any) => Number(s.discount_amount) > Number(s.grand_total) * 0.2);
    if (highDiscounts.length > 3) {
      const discountTotal = highDiscounts.reduce((s: number, d: any) => s + Number(d.discount_amount || 0), 0);
      incidents.push({ store_id: storeId, incident_type: 'repeated_discount', severity: 'medium', description: `${highDiscounts.length} sales with >20% discount totaling ₹${discountTotal.toLocaleString('en-IN')}`, evidence: { count: highDiscounts.length, totalDiscount: discountTotal }, estimated_loss: discountTotal, status: 'open' });
    }

    // 3. Cash drawer mismatch (simplified — would need POS reconciliation data)
    // 4. Late settlements
    const { data: lateSales } = await supabase.from('sales').select('id, created_at').eq('store_id', storeId).eq('status', 'completed').gte('created_at', weekAgo);
    const lateSettlements = (lateSales || []).filter((s: any) => { const h = new Date(s.created_at).getHours(); return h >= 23 || h <= 4; });
    if (lateSettlements.length > 2) {
      incidents.push({ store_id: storeId, incident_type: 'late_settlement', severity: 'low', description: `${lateSettlements.length} transactions recorded outside business hours`, evidence: { count: lateSettlements.length }, estimated_loss: 0, status: 'open' });
    }

    if (incidents.length === 0) return [];
    const { data } = await supabase.from('loss_incidents').insert(incidents).select();
    return (data || []) as LossIncidentRow[];
  }

  async getIncidents(storeId: string, status?: string): Promise<LossIncidentRow[]> {
    let query = supabase.from('loss_incidents').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data } = await query.limit(100);
    return (data || []) as LossIncidentRow[];
  }

  async updateIncident(incidentId: string, updates: { status?: string; resolution?: string }): Promise<void> {
    const u: any = {};
    if (updates.status) u.status = updates.status;
    if (updates.resolution) u.resolution = updates.resolution;
    if (updates.status === 'resolved' || updates.status === 'false_positive') u.resolved_at = new Date().toISOString();
    await supabase.from('loss_incidents').update(u).eq('id', incidentId);
  }

  async getSummary(storeId: string): Promise<{ open: number; totalLoss: number; critical: number }> {
    const incidents = await this.getIncidents(storeId, 'open');
    return {
      open: incidents.length,
      totalLoss: incidents.reduce((s, i) => s + i.estimated_loss, 0),
      critical: incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length,
    };
  }
}
export const lossPreventionService = new LossPreventionService();
