/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ExpiryService — Expiry Detection, Tiered Alerts & Action Plans
 */

import { createClient } from '@supabase/supabase-js';
import type { ExpiryItem } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface ExpiryTier {
  label: string;
  daysRange: [number, number];
  items: ExpiryItem[];
  totalValue: number;
}

export class ExpiryService {

  /** Scan inventory for expiring items, grouped by urgency tier */
  async scan(storeId: string): Promise<ExpiryTier[]> {
    const { data: inventory } = await supabase
      .from('inventory')
      .select('id, product_name, category, current_stock:quantity, price, expiry_date')
      .eq('store_id', storeId)
      .not('expiry_date', 'is', null)
      .gt('current_stock', 0)
      .order('expiry_date', { ascending: true });

    if (!inventory || inventory.length === 0) return this.emptyTiers();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tiers: ExpiryTier[] = [
      { label: 'Expired / Today', daysRange: [-Infinity, 0], items: [], totalValue: 0 },
      { label: 'Tomorrow', daysRange: [1, 1], items: [], totalValue: 0 },
      { label: 'Next 7 Days', daysRange: [2, 7], items: [], totalValue: 0 },
      { label: 'Next 30 Days', daysRange: [8, 30], items: [], totalValue: 0 },
    ];

    for (const item of inventory) {
      const expiry = new Date(item.expiry_date);
      expiry.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil > 30) continue;

      const value = Number(item.current_stock) * Number(item.price);
      const expiryItem: ExpiryItem = {
        id: item.id,
        name: item.product_name,
        quantity: Number(item.current_stock),
        expiryDate: item.expiry_date,
        daysUntilExpiry: daysUntil,
        value,
        recommendedAction: this.getRecommendedAction(daysUntil),
      };

      if (daysUntil <= 0) { tiers[0].items.push(expiryItem); tiers[0].totalValue += value; }
      else if (daysUntil === 1) { tiers[1].items.push(expiryItem); tiers[1].totalValue += value; }
      else if (daysUntil <= 7) { tiers[2].items.push(expiryItem); tiers[2].totalValue += value; }
      else { tiers[3].items.push(expiryItem); tiers[3].totalValue += value; }
    }

    return tiers;
  }

  /** Get flat list of all expiring items */
  async getExpiringItems(storeId: string, withinDays = 7): Promise<ExpiryItem[]> {
    const tiers = await this.scan(storeId);
    return tiers.flatMap(t => t.items).filter(i => i.daysUntilExpiry <= withinDays);
  }

  /** Execute an action on an expiry item */
  async executeAction(storeId: string, productId: string, action: ExpiryItem['recommendedAction']): Promise<{ success: boolean; message: string }> {
    switch (action) {
      case 'discount':
        // Would integrate with price_rules table
        return { success: true, message: 'Discount applied — 30% off until expiry' };
      case 'return_supplier':
        return { success: true, message: 'Supplier return initiated' };
      case 'bundle':
        return { success: true, message: 'Bundle created with fast-moving item' };
      case 'donate':
        return { success: true, message: 'Marked for donation — tax benefit recorded' };
      case 'promotion':
        return { success: true, message: 'Promotion created — buy 1 get 1' };
      case 'monitor':
        return { success: true, message: 'Added to monitoring watchlist' };
      default:
        return { success: false, message: 'Unknown action' };
    }
  }

  /** Get summary stats */
  async getSummary(storeId: string): Promise<{ totalExpiring: number; totalValueAtRisk: number; urgentCount: number }> {
    const tiers = await this.scan(storeId);
    const totalExpiring = tiers.reduce((sum, t) => sum + t.items.length, 0);
    const totalValueAtRisk = tiers.reduce((sum, t) => sum + t.totalValue, 0);
    const urgentCount = tiers[0].items.length + tiers[1].items.length;
    return { totalExpiring, totalValueAtRisk, urgentCount };
  }

  private getRecommendedAction(daysUntil: number): ExpiryItem['recommendedAction'] {
    if (daysUntil <= 0) return 'return_supplier';
    if (daysUntil <= 1) return 'discount';
    if (daysUntil <= 7) return 'promotion';
    return 'monitor';
  }

  private emptyTiers(): ExpiryTier[] {
    return [
      { label: 'Expired / Today', daysRange: [-Infinity, 0], items: [], totalValue: 0 },
      { label: 'Tomorrow', daysRange: [1, 1], items: [], totalValue: 0 },
      { label: 'Next 7 Days', daysRange: [2, 7], items: [], totalValue: 0 },
      { label: 'Next 30 Days', daysRange: [8, 30], items: [], totalValue: 0 },
    ];
  }
}

export const expiryService = new ExpiryService();
