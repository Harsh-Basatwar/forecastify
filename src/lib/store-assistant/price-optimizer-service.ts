/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PriceOptimizerService — Dynamic AI Pricing Engine
 */

import { createClient } from '@supabase/supabase-js';
import type { PriceRuleRow, PriceOptimization } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export class PriceOptimizerService {

  /** Generate price optimization suggestions */
  async getOptimizations(storeId: string): Promise<PriceOptimization[]> {
    const { data: inventory } = await supabase
      .from('inventory')
      .select('id, product_name, category, current_stock:quantity, price, cost_price, expiry_date')
      .eq('store_id', storeId)
      .gt('current_stock', 0);

    if (!inventory || inventory.length === 0) return [];

    // Get weekly sales volume per product
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: salesData } = await supabase
      .from('sale_items')
      .select('product_id, quantity, unit_price')
      .gte('created_at', weekAgo);

    const salesMap = new Map<string, { qty: number; revenue: number }>();
    for (const s of (salesData || [])) {
      const existing = salesMap.get(s.product_id) || { qty: 0, revenue: 0 };
      salesMap.set(s.product_id, { qty: existing.qty + Number(s.quantity), revenue: existing.revenue + Number(s.quantity) * Number(s.unit_price) });
    }

    const optimizations: PriceOptimization[] = [];

    for (const item of inventory) {
      const price = Number(item.price);
      const costPrice = Number(item.cost_price || price * 0.7);
      const margin = price > 0 ? ((price - costPrice) / price) * 100 : 0;
      const stock = Number(item.current_stock);
      const sales = salesMap.get(item.id);
      const weeklyQty = sales?.qty || 0;
      const dailyDemand = weeklyQty / 7;
      const daysOfStock = dailyDemand > 0 ? stock / dailyDemand : 999;

      // Determine strategy
      let strategy: PriceOptimization['strategy'] = 'increase';
      let recommendedPrice = price;
      let justification = '';

      // Expiry proximity
      if (item.expiry_date) {
        const daysToExpiry = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry <= 7 && daysToExpiry > 0) {
          strategy = 'clearance';
          recommendedPrice = Math.round(costPrice * 1.05); // Near cost
          justification = `Expiring in ${daysToExpiry} days — clearance price to recover cost`;
          optimizations.push(this.buildOptimization(item, price, recommendedPrice, strategy, justification, { demand: weeklyQty, expiry: daysToExpiry, margin, inventory: daysOfStock }));
          continue;
        }
      }

      // Overstock — discount to move
      if (daysOfStock > 60 && stock > 20) {
        strategy = 'decrease';
        recommendedPrice = Math.round(price * 0.85);
        justification = `${daysOfStock.toFixed(0)} days of stock — reduce price 15% to increase velocity`;
      }
      // High demand + low stock — increase price
      else if (dailyDemand > 3 && daysOfStock < 7 && margin < 30) {
        strategy = 'increase';
        recommendedPrice = Math.round(price * 1.1);
        justification = `High demand (${dailyDemand.toFixed(1)}/day) with only ${daysOfStock.toFixed(0)} days of stock — increase price 10%`;
      }
      // Low margin — increase
      else if (margin < 15 && dailyDemand > 1) {
        strategy = 'increase';
        recommendedPrice = Math.round(costPrice * 1.25);
        justification = `Current margin only ${margin.toFixed(1)}% — increase to 25% target`;
      }
      else {
        continue; // No optimization needed
      }

      optimizations.push(this.buildOptimization(item, price, recommendedPrice, strategy, justification, { demand: weeklyQty, expiry: 999, margin, inventory: daysOfStock }));
    }

    return optimizations.sort((a, b) => Math.abs(b.expectedImpact.revenueDelta) - Math.abs(a.expectedImpact.revenueDelta));
  }

  /** Apply a price change */
  async applyPrice(storeId: string, productId: string, newPrice: number): Promise<boolean> {
    const { error } = await supabase.from('inventory').update({ price: newPrice }).eq('id', productId);
    if (!error) {
      await supabase.from('price_rules').update({ status: 'applied', applied_at: new Date().toISOString() })
        .eq('store_id', storeId).eq('product_id', productId).eq('status', 'approved');
    }
    return !error;
  }

  /** Apply a discount */
  async applyDiscount(productId: string, discountPct: number): Promise<boolean> {
    const { data: item } = await supabase.from('inventory').select('price').eq('id', productId).single();
    if (!item) return false;
    const newPrice = Math.round(Number(item.price) * (1 - discountPct / 100));
    const { error } = await supabase.from('inventory').update({ price: newPrice }).eq('id', productId);
    return !error;
  }

  /** Get price rules */
  async getRules(storeId: string, status?: string): Promise<PriceRuleRow[]> {
    let query = supabase.from('price_rules').select('*, inventory(product_name)').eq('store_id', storeId).order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data } = await query.limit(100);
    return (data || []).map((r: any) => ({ ...r, product_name: r.inventory?.product_name })) as PriceRuleRow[];
  }

  private buildOptimization(item: any, currentPrice: number, recommendedPrice: number, strategy: PriceOptimization['strategy'], justification: string, factors: any): PriceOptimization {
    const priceDelta = recommendedPrice - currentPrice;
    const weeklyQty = factors.demand || 0;
    return {
      productId: item.id,
      productName: item.product_name,
      currentPrice,
      recommendedPrice,
      strategy,
      justification,
      factors: {
        demand: factors.demand,
        competition: 50,
        inventory: factors.inventory,
        expiry: factors.expiry,
        elasticity: -1.2,
        margin: factors.margin,
      },
      expectedImpact: {
        revenueDelta: Math.round(priceDelta * weeklyQty),
        marginDelta: Math.round(((recommendedPrice - (currentPrice * 0.7)) / recommendedPrice - factors.margin / 100) * 100),
        unitsSoldDelta: strategy === 'decrease' ? Math.round(weeklyQty * 0.15) : Math.round(weeklyQty * -0.05),
      },
    };
  }
}

export const priceOptimizerService = new PriceOptimizerService();
