/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HealthService — Composite Store Health Score (9 Dimensions)
 */

import { createClient } from '@supabase/supabase-js';
import type { StoreHealthRow, HealthDimensions } from './types';
import { HEALTH_DIMENSION_WEIGHTS } from './constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

export class HealthService {

  /** Compute today's health score */
  async compute(storeId: string): Promise<StoreHealthRow> {
    const today = new Date().toISOString().split('T')[0];

    // Check cache
    const { data: existing } = await supabase
      .from('store_health_snapshots')
      .select('*')
      .eq('store_id', storeId)
      .eq('snapshot_date', today)
      .maybeSingle();

    if (existing) return existing as StoreHealthRow;

    // Compute all dimensions in parallel
    const [invScore, cashScore, profitScore, expiryScore, supplierScore, taskScore, salesScore] = await Promise.all([
      this.computeInventoryScore(storeId),
      this.computeCashScore(storeId),
      this.computeProfitScore(storeId),
      this.computeExpiryScore(storeId),
      this.computeSupplierScore(storeId),
      this.computeTaskScore(storeId),
      this.computeSalesScore(storeId),
    ]);

    const dimensions: HealthDimensions = {
      inventory: invScore,
      cash: cashScore,
      profit: profitScore,
      expiry: expiryScore,
      forecastAccuracy: 75, // Would come from forecast engine
      supplierHealth: supplierScore,
      recommendationAdoption: 60, // Would track recommendation follow-through
      employeePerformance: taskScore,
      salesTrend: salesScore,
    };

    // Weighted composite
    const overall = Math.round(
      Object.entries(dimensions).reduce((sum, [key, value]) => {
        return sum + value * (HEALTH_DIMENSION_WEIGHTS[key] || 0.1);
      }, 0)
    );

    // Determine trend from history
    const { data: prev } = await supabase
      .from('store_health_snapshots')
      .select('overall_score')
      .eq('store_id', storeId)
      .order('snapshot_date', { ascending: false })
      .limit(1);

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (prev && prev.length > 0) {
      const diff = overall - prev[0].overall_score;
      if (diff > 3) trend = 'improving';
      else if (diff < -3) trend = 'declining';
    }

    // Generate recommendations for lowest dimensions
    const sorted = Object.entries(dimensions).sort(([, a], [, b]) => a - b);
    const recommendations = sorted.slice(0, 3).map(([dim, score]) => {
      return `Improve ${dim} (score: ${score}/100): ${this.getRecommendation(dim, score)}`;
    });

    // Save snapshot
    const { data: snapshot } = await supabase
      .from('store_health_snapshots')
      .insert({
        store_id: storeId,
        snapshot_date: today,
        overall_score: overall,
        dimensions,
        recommendations,
        trend,
      })
      .select()
      .single();

    return (snapshot || { id: '', store_id: storeId, snapshot_date: today, overall_score: overall, dimensions, recommendations, trend, created_at: new Date().toISOString() }) as StoreHealthRow;
  }

  /** Get health history */
  async getHistory(storeId: string, days = 30): Promise<StoreHealthRow[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data } = await supabase
      .from('store_health_snapshots')
      .select('*')
      .eq('store_id', storeId)
      .gte('snapshot_date', since)
      .order('snapshot_date', { ascending: true });

    return (data || []) as StoreHealthRow[];
  }

  // ── Dimension Computations ────────────────────────────────

  private async computeInventoryScore(storeId: string): Promise<number> {
    const { data } = await supabase
      .from('inventory')
      .select('current_stock, reorder_point')
      .eq('store_id', storeId);

    if (!data || data.length === 0) return 50;
    const stockouts = data.filter((i: any) => Number(i.current_stock) <= 0).length;
    const stockoutRatio = stockouts / data.length;
    return Math.max(0, Math.min(100, Math.round((1 - stockoutRatio * 5) * 100)));
  }

  private async computeCashScore(storeId: string): Promise<number> {
    const { data } = await supabase
      .from('sales')
      .select('grand_total, payment_status')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!data || data.length === 0) return 50;
    const paid = data.filter((s: any) => s.payment_status === 'paid').length;
    return Math.round((paid / data.length) * 100);
  }

  private async computeProfitScore(storeId: string): Promise<number> {
    const { data } = await supabase
      .from('sales')
      .select('grand_total, subtotal')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!data || data.length === 0) return 50;
    const revenue = data.reduce((sum: number, s: any) => sum + Number(s.grand_total || 0), 0);
    // Simple margin proxy — if revenue exists, score > 50
    return revenue > 0 ? Math.min(100, Math.round(50 + (revenue / 10000) * 10)) : 30;
  }

  private async computeExpiryScore(storeId: string): Promise<number> {
    const { data } = await supabase
      .from('inventory')
      .select('id, expiry_date, current_stock')
      .eq('store_id', storeId)
      .not('expiry_date', 'is', null)
      .gt('current_stock', 0);

    if (!data || data.length === 0) return 100;
    const today = new Date();
    const expiring = data.filter((i: any) => {
      const diff = Math.ceil((new Date(i.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 7;
    }).length;
    const ratio = expiring / data.length;
    return Math.max(0, Math.round((1 - ratio * 10) * 100));
  }

  private async computeSupplierScore(storeId: string): Promise<number> {
    const { data } = await supabase
      .from('suppliers')
      .select('reliability_score')
      .eq('store_id', storeId);

    if (!data || data.length === 0) return 70;
    const avg = data.reduce((sum: number, s: any) => sum + Number(s.reliability_score || 70), 0) / data.length;
    return Math.round(avg);
  }

  private async computeTaskScore(storeId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('employee_tasks')
      .select('status')
      .eq('store_id', storeId)
      .gte('created_at', `${today}T00:00:00`);

    if (!data || data.length === 0) return 70;
    const completed = data.filter((t: any) => t.status === 'completed').length;
    return Math.round((completed / data.length) * 100);
  }

  private async computeSalesScore(storeId: string): Promise<number> {
    const week1 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const week2 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const { data: thisWeek } = await supabase
      .from('sales')
      .select('grand_total')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', week1.toISOString());

    const { data: lastWeek } = await supabase
      .from('sales')
      .select('grand_total')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', week2.toISOString())
      .lte('created_at', week1.toISOString());

    const thisTotal = (thisWeek || []).reduce((s: number, r: any) => s + Number(r.grand_total || 0), 0);
    const lastTotal = (lastWeek || []).reduce((s: number, r: any) => s + Number(r.grand_total || 0), 0);

    if (lastTotal === 0) return 50;
    const growth = ((thisTotal - lastTotal) / lastTotal) * 100;
    return Math.max(0, Math.min(100, Math.round(50 + growth * 2)));
  }

  private getRecommendation(dimension: string, score: number): string {
    const recs: Record<string, string> = {
      inventory: score < 50 ? 'Multiple stockouts detected — generate purchase orders immediately' : 'Review reorder points for underperforming items',
      cash: 'Improve collection rate — send khata reminders to overdue accounts',
      profit: 'Focus on high-margin products and reduce discounting',
      expiry: 'Clear near-expiry items with promotions or supplier returns',
      forecastAccuracy: 'Review forecast model inputs — add recent sales data',
      supplierHealth: 'Consider alternative suppliers for low-reliability vendors',
      recommendationAdoption: 'Review and act on AI recommendations more frequently',
      employeePerformance: 'Follow up on incomplete tasks — assign accountability',
      salesTrend: 'Run targeted promotions to boost foot traffic',
    };
    return recs[dimension] || 'Review and optimize this area';
  }
}

export const healthService = new HealthService();
