/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SupplierRankingService — Multi-Criteria Weighted Supplier Ranking
 */

import { createClient } from '@supabase/supabase-js';
import type { SupplierScore } from './types';
import { SUPPLIER_RANKING_WEIGHTS } from './constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export class SupplierRankingService {

  /** Rank all suppliers for a store */
  async rankSuppliers(storeId: string): Promise<SupplierScore[]> {
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('*')
      .eq('store_id', storeId);

    if (!suppliers || suppliers.length === 0) return [];

    const scores: SupplierScore[] = [];

    for (const sup of suppliers) {
      // Get PO history for this supplier
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('total_amount, status, created_at')
        .eq('store_id', storeId)
        .eq('supplier_id', sup.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const poHistory = pos || [];
      const completedPOs = poHistory.filter((p: any) => p.status === 'delivered' || p.status === 'completed');
      const avgAmount = completedPOs.length > 0 ? completedPOs.reduce((s: number, p: any) => s + Number(p.total_amount), 0) / completedPOs.length : 0;

      // Compute dimension scores (0-100)
      const priceScore = this.normalizePriceScore(avgAmount, sup.payment_terms);
      const reliabilityScore = Math.min(100, Number(sup.reliability_score || 70));
      const leadTimeScore = this.normalizeLeadTime(Number(sup.avg_lead_time || 7));
      const defectRateScore = Math.max(0, 100 - Number(sup.defect_rate || 5) * 10);
      const availabilityScore = Math.min(100, Number(sup.fill_rate || 90));
      const creditPeriodScore = this.normalizeCreditPeriod(sup.payment_terms);
      const historicalScore = completedPOs.length > 0 ? Math.min(100, completedPOs.length * 5 + 50) : 30;

      // Weighted composite
      const w = SUPPLIER_RANKING_WEIGHTS;
      const overall = Math.round(
        priceScore * w.price +
        reliabilityScore * w.reliability +
        leadTimeScore * w.leadTime +
        defectRateScore * w.defectRate +
        availabilityScore * w.availability +
        creditPeriodScore * w.creditPeriod +
        historicalScore * w.historical
      );

      scores.push({
        supplierId: sup.id,
        supplierName: sup.name || sup.company_name || 'Unknown',
        overallScore: overall,
        priceScore,
        reliabilityScore,
        leadTimeScore,
        defectRateScore,
        availabilityScore,
        creditPeriodScore,
        historicalScore,
        rank: overall >= 80 ? 'best' : overall >= 60 ? 'good' : 'avoid',
      });
    }

    return scores.sort((a, b) => b.overallScore - a.overallScore);
  }

  /** Get best supplier for a specific category */
  async getBestSupplier(storeId: string, category?: string): Promise<SupplierScore | null> {
    const ranked = await this.rankSuppliers(storeId);
    return ranked.length > 0 ? ranked[0] : null;
  }

  private normalizePriceScore(avgAmount: number, paymentTerms: string | null): number {
    // Lower average PO = potentially better pricing
    if (avgAmount === 0) return 50;
    if (avgAmount < 5000) return 85;
    if (avgAmount < 10000) return 75;
    if (avgAmount < 25000) return 65;
    return 55;
  }

  private normalizeLeadTime(days: number): number {
    if (days <= 1) return 100;
    if (days <= 3) return 85;
    if (days <= 5) return 70;
    if (days <= 7) return 55;
    return Math.max(20, 100 - days * 5);
  }

  private normalizeCreditPeriod(terms: string | null): number {
    if (!terms) return 50;
    const lower = terms.toLowerCase();
    if (lower.includes('30') || lower.includes('net 30')) return 90;
    if (lower.includes('15') || lower.includes('net 15')) return 75;
    if (lower.includes('7')) return 60;
    if (lower.includes('cod') || lower.includes('advance')) return 40;
    return 50;
  }
}

export const supplierRankingService = new SupplierRankingService();
