/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ShrinkageService — Theft, Damage & Loss Detection
 */

import { createClient } from '@supabase/supabase-js';
import type { ShrinkageReportRow } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface ShrinkageSummary {
  totalVariance: number;
  totalValueLost: number;
  openReports: number;
  resolvedReports: number;
  categoryBreakdown: { category: string; count: number; value: number }[];
  suspiciousPatterns: string[];
}

export class ShrinkageService {

  /** Detect shrinkage by comparing expected vs actual stock */
  async detectShrinkage(storeId: string): Promise<ShrinkageReportRow[]> {
    // Get inventory with sales data to compute expected stock
    const { data: inventory } = await supabase
      .from('inventory')
      .select('id, product_name, category, current_stock:quantity, price')
      .eq('store_id', storeId)
      .gt('current_stock', 0);

    if (!inventory) return [];

    // Get today's existing reports to avoid duplicates
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('shrinkage_reports')
      .select('product_id')
      .eq('store_id', storeId)
      .eq('report_date', today);

    const existingIds = new Set((existing || []).map((r: any) => r.product_id));
    const newReports: ShrinkageReportRow[] = [];

    // Simplified: flag items where stock seems anomalously low
    // Full implementation would compare opening_stock + received - sold - adjustments vs current_stock
    for (const item of inventory) {
      if (existingIds.has(item.id)) continue;

      const stock = Number(item.current_stock);
      // Threshold: flag if stock dropped to negative or has known discrepancy
      if (stock < 0) {
        const variance = Math.abs(stock);
        const report: any = {
          store_id: storeId,
          report_date: today,
          product_id: item.id,
          product_name: item.product_name,
          expected_qty: variance,
          actual_qty: 0,
          variance,
          variance_value: variance * Number(item.price),
          category: 'unknown',
          investigation_status: 'open',
        };

        const { data } = await supabase
          .from('shrinkage_reports')
          .insert(report)
          .select()
          .single();

        if (data) newReports.push(data as ShrinkageReportRow);
      }
    }

    return newReports;
  }

  /** Get all shrinkage reports */
  async getReports(storeId: string, statusFilter?: string, limit = 50): Promise<ShrinkageReportRow[]> {
    let query = supabase
      .from('shrinkage_reports')
      .select('*')
      .eq('store_id', storeId)
      .order('report_date', { ascending: false })
      .limit(limit);

    if (statusFilter) query = query.eq('investigation_status', statusFilter);

    const { data } = await query;
    return (data || []) as ShrinkageReportRow[];
  }

  /** Update investigation status */
  async updateStatus(reportId: string, status: string, resolution?: string): Promise<void> {
    const updates: Record<string, any> = { investigation_status: status };
    if (status === 'resolved' || status === 'written_off') {
      updates.resolved_at = new Date().toISOString();
      if (resolution) updates.notes = resolution;
    }
    await supabase.from('shrinkage_reports').update(updates).eq('id', reportId);
  }

  /** Categorize a report */
  async categorize(reportId: string, category: string): Promise<void> {
    await supabase.from('shrinkage_reports').update({ category }).eq('id', reportId);
  }

  /** Get summary stats */
  async getSummary(storeId: string): Promise<ShrinkageSummary> {
    const reports = await this.getReports(storeId, undefined, 200);
    const open = reports.filter(r => r.investigation_status === 'open' || r.investigation_status === 'investigating');
    const resolved = reports.filter(r => r.investigation_status === 'resolved' || r.investigation_status === 'written_off');

    // Category breakdown
    const catMap = new Map<string, { count: number; value: number }>();
    for (const r of reports) {
      const existing = catMap.get(r.category) || { count: 0, value: 0 };
      catMap.set(r.category, { count: existing.count + 1, value: existing.value + r.variance_value });
    }

    // Suspicious patterns
    const patterns: string[] = [];
    const productFreq = new Map<string, number>();
    for (const r of reports) {
      const freq = (productFreq.get(r.product_name) || 0) + 1;
      productFreq.set(r.product_name, freq);
    }
    for (const [name, freq] of productFreq) {
      if (freq >= 3) patterns.push(`${name} has ${freq} loss incidents — investigate`);
    }

    return {
      totalVariance: reports.reduce((sum, r) => sum + r.variance, 0),
      totalValueLost: reports.reduce((sum, r) => sum + r.variance_value, 0),
      openReports: open.length,
      resolvedReports: resolved.length,
      categoryBreakdown: Array.from(catMap.entries()).map(([category, data]) => ({ category, ...data })),
      suspiciousPatterns: patterns,
    };
  }
}

export const shrinkageService = new ShrinkageService();
