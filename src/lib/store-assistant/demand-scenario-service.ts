/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DemandScenarioService — What-If Demand Shock Simulator
 */
import { createClient } from '@supabase/supabase-js';
import type { DemandScenarioRow, ScenarioImpact } from './types';
import { DEMAND_SCENARIOS } from './constants';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export class DemandScenarioService {
  getAvailableScenarios() { return DEMAND_SCENARIOS; }

  async simulate(storeId: string, scenarioName: string, durationDays?: number): Promise<DemandScenarioRow | null> {
    const scenarioDef = DEMAND_SCENARIOS.find(s => s.name === scenarioName);
    if (!scenarioDef) return null;
    const duration = durationDays || scenarioDef.defaultDuration;

    const { data: inventory } = await supabase.from('inventory').select('id, product_name, category, current_stock:quantity, price').eq('store_id', storeId).gt('current_stock', 0);
    if (!inventory || inventory.length === 0) return null;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: salesData } = await supabase.from('sale_items').select('product_id, quantity').gte('created_at', weekAgo);
    const demandMap = new Map<string, number>();
    for (const s of (salesData || [])) demandMap.set(s.product_id, (demandMap.get(s.product_id) || 0) + Number(s.quantity));

    const baseline: Record<string, number> = {};
    const simulated: Record<string, number> = {};
    let revenueDelta = 0;
    const topAffected: { name: string; impact: number }[] = [];

    for (const item of inventory) {
      const weeklyDemand = demandMap.get(item.id) || 0;
      const dailyDemand = weeklyDemand / 7;
      baseline[item.product_name] = Math.round(dailyDemand * duration);
      const multiplier = scenarioDef.categoryImpact[item.category] || 1.0;
      const newDemand = Math.round(dailyDemand * multiplier * duration);
      simulated[item.product_name] = newDemand;
      const delta = (newDemand - baseline[item.product_name]) * Number(item.price);
      revenueDelta += delta;
      if (Math.abs(multiplier - 1) > 0.1) topAffected.push({ name: item.product_name, impact: Math.round((multiplier - 1) * 100) });
    }

    topAffected.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    const impact: ScenarioImpact = { revenueDelta: Math.round(revenueDelta), revenueDeltaPct: 0, stockoutRisk: topAffected.filter(t => t.impact > 50).length, topAffectedProducts: topAffected.slice(0, 10) };
    const actions = this.generateActions(scenarioDef, impact);

    const { data, error } = await supabase.from('demand_scenarios').insert({
      store_id: storeId, scenario_name: scenarioName, scenario_type: scenarioDef.type,
      parameters: { durationDays: duration, severity: scenarioDef.defaultSeverity, affectedCategories: Object.keys(scenarioDef.categoryImpact) },
      baseline_demand: baseline, simulated_demand: simulated, impact_summary: impact, recommended_actions: actions,
    }).select().single();
    if (error) return null;
    return data as DemandScenarioRow;
  }

  async getHistory(storeId: string): Promise<DemandScenarioRow[]> {
    const { data } = await supabase.from('demand_scenarios').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(20);
    return (data || []) as DemandScenarioRow[];
  }

  private generateActions(scenario: any, impact: ScenarioImpact): string[] {
    const actions: string[] = [];
    if (impact.stockoutRisk > 0) actions.push(`Pre-order ${impact.stockoutRisk} high-demand categories to prevent stockouts`);
    if (impact.revenueDelta > 0) actions.push('Increase stock for high-demand categories before the event');
    if (impact.revenueDelta < 0) actions.push('Reduce orders for affected categories to avoid overstock');
    actions.push('Update employee schedules based on expected demand changes');
    return actions;
  }
}
export const demandScenarioService = new DemandScenarioService();
