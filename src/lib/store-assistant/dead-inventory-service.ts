/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DeadInventoryService — Non-Selling Product Detection & Liquidation
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface DeadInventoryItem {
  productId: string;
  productName: string;
  category: string;
  currentStock: number;
  price: number;
  capitalBlocked: number;
  lastSaleDate: string | null;
  daysSinceLastSale: number;
  bucket: '15d' | '30d' | '60d' | '90d+';
  recommendedAction: 'bundle' | 'discount' | 'transfer' | 'return_supplier' | 'liquidate' | 'promotion';
}

export interface DeadInventorySummary {
  totalItems: number;
  totalCapitalBlocked: number;
  buckets: { bucket: string; count: number; capital: number }[];
  items: DeadInventoryItem[];
}

export class DeadInventoryService {

  async detect(storeId: string): Promise<DeadInventorySummary> {
    // Get all inventory items with stock
    const { data: inventory } = await supabase
      .from('inventory')
      .select('id, product_name, category, current_stock, price')
      .eq('store_id', storeId)
      .gt('current_stock', 0);

    if (!inventory || inventory.length === 0) {
      return { totalItems: 0, totalCapitalBlocked: 0, buckets: [], items: [] };
    }

    // Get last sale date for each product from sale_items
    const productIds = inventory.map((i: any) => i.id);
    const { data: salesData } = await supabase
      .from('sale_items')
      .select('product_id, created_at')
      .in('product_id', productIds)
      .order('created_at', { ascending: false });

    // Build last-sale map
    const lastSaleMap = new Map<string, string>();
    for (const sale of (salesData || [])) {
      if (!lastSaleMap.has(sale.product_id)) {
        lastSaleMap.set(sale.product_id, sale.created_at);
      }
    }

    const now = new Date();
    const items: DeadInventoryItem[] = [];

    for (const item of inventory) {
      const lastSale = lastSaleMap.get(item.id);
      let daysSince: number;

      if (!lastSale) {
        // Never sold — use product creation as proxy (treat as 90+ days)
        daysSince = 90;
      } else {
        daysSince = Math.ceil((now.getTime() - new Date(lastSale).getTime()) / (1000 * 60 * 60 * 24));
      }

      if (daysSince < 15) continue; // Not dead

      const capitalBlocked = Number(item.current_stock) * Number(item.price);
      let bucket: DeadInventoryItem['bucket'];
      if (daysSince < 30) bucket = '15d';
      else if (daysSince < 60) bucket = '30d';
      else if (daysSince < 90) bucket = '60d';
      else bucket = '90d+';

      items.push({
        productId: item.id,
        productName: item.product_name,
        category: item.category,
        currentStock: Number(item.current_stock),
        price: Number(item.price),
        capitalBlocked,
        lastSaleDate: lastSale || null,
        daysSinceLastSale: daysSince,
        bucket,
        recommendedAction: this.getAction(daysSince, capitalBlocked),
      });
    }

    // Sort by capital blocked descending
    items.sort((a, b) => b.capitalBlocked - a.capitalBlocked);

    const totalCapitalBlocked = items.reduce((sum, i) => sum + i.capitalBlocked, 0);
    const buckets = [
      { bucket: '15-30 days', count: items.filter(i => i.bucket === '15d').length, capital: items.filter(i => i.bucket === '15d').reduce((s, i) => s + i.capitalBlocked, 0) },
      { bucket: '30-60 days', count: items.filter(i => i.bucket === '30d').length, capital: items.filter(i => i.bucket === '30d').reduce((s, i) => s + i.capitalBlocked, 0) },
      { bucket: '60-90 days', count: items.filter(i => i.bucket === '60d').length, capital: items.filter(i => i.bucket === '60d').reduce((s, i) => s + i.capitalBlocked, 0) },
      { bucket: '90+ days', count: items.filter(i => i.bucket === '90d+').length, capital: items.filter(i => i.bucket === '90d+').reduce((s, i) => s + i.capitalBlocked, 0) },
    ];

    return { totalItems: items.length, totalCapitalBlocked, buckets, items };
  }

  private getAction(daysSince: number, capital: number): DeadInventoryItem['recommendedAction'] {
    if (daysSince >= 90) return capital > 5000 ? 'liquidate' : 'return_supplier';
    if (daysSince >= 60) return 'discount';
    if (daysSince >= 30) return 'bundle';
    return 'promotion';
  }
}

export const deadInventoryService = new DeadInventoryService();
