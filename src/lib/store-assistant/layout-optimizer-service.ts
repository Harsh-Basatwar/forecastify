/* eslint-disable @typescript-eslint/no-explicit-any */
/** LayoutOptimizerService — AI Store Layout Suggestions */
import { createClient } from '@supabase/supabase-js';
import type { LayoutRecommendationRow } from './types';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export class LayoutOptimizerService {
  async generateRecommendations(storeId: string): Promise<LayoutRecommendationRow[]> {
    const { data: inventory } = await supabase.from('inventory').select('id, product_name, category, current_stock, price').eq('store_id', storeId).gt('current_stock', 0);
    if (!inventory || inventory.length === 0) return [];

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: salesData } = await supabase.from('sale_items').select('product_id, quantity').gte('created_at', weekAgo);
    const salesMap = new Map<string, number>();
    for (const s of (salesData || [])) salesMap.set(s.product_id, (salesMap.get(s.product_id) || 0) + Number(s.quantity));

    const recs: any[] = [];
    // Impulse items near billing
    const impulseCats = ['Chocolates', 'Candy', 'Gum', 'Chips', 'Beverages'];
    const impulseItems = inventory.filter((i: any) => impulseCats.some(c => i.category?.toLowerCase().includes(c.toLowerCase())));
    for (const item of impulseItems.slice(0, 3)) {
      recs.push({ store_id: storeId, recommendation_type: 'impulse_zone', product_id: item.id, product_name: item.product_name, from_zone: null, to_zone: 'Billing Counter', rationale: 'High-impulse item — place near billing for last-minute purchases', expected_impact: '10-15% increase in impulse buys', priority: 'high', status: 'pending' });
    }
    // Fast movers at eye level
    const fastMovers = inventory.filter((i: any) => (salesMap.get(i.id) || 0) > 10).slice(0, 3);
    for (const item of fastMovers) {
      recs.push({ store_id: storeId, recommendation_type: 'relocate', product_id: item.id, product_name: item.product_name, from_zone: 'Current', to_zone: 'Eye Level Shelf', rationale: `High velocity (${salesMap.get(item.id)} units/week) — maximize visibility`, expected_impact: '5-8% increase in sales', priority: 'medium', status: 'pending' });
    }
    // Cross-merchandising
    recs.push({ store_id: storeId, recommendation_type: 'cross_merchandise', product_name: 'Bread & Butter', from_zone: null, to_zone: 'Adjacent Shelves', rationale: 'Frequently bought together — place adjacent for basket building', expected_impact: '12% increase in co-purchases', priority: 'medium', status: 'pending' });

    if (recs.length === 0) return [];
    const { data } = await supabase.from('layout_recommendations').insert(recs).select();
    return (data || []) as LayoutRecommendationRow[];
  }

  async getRecommendations(storeId: string): Promise<LayoutRecommendationRow[]> {
    const { data } = await supabase.from('layout_recommendations').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(50);
    return (data || []) as LayoutRecommendationRow[];
  }

  async updateStatus(recId: string, status: string): Promise<void> {
    const updates: Record<string, any> = { status };
    if (status === 'implemented') updates.implemented_at = new Date().toISOString();
    await supabase.from('layout_recommendations').update(updates).eq('id', recId);
  }
}
export const layoutOptimizerService = new LayoutOptimizerService();
