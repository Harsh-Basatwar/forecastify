/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ShelfService — Shelf Zone Management & Refill Routing
 */

import { createClient } from '@supabase/supabase-js';
import type { ShelfZoneRow, RefillTask } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export class ShelfService {

  async getZones(storeId: string): Promise<ShelfZoneRow[]> {
    const { data } = await supabase
      .from('shelf_zones')
      .select('*')
      .eq('store_id', storeId)
      .order('walking_sequence', { ascending: true });
    return (data || []) as ShelfZoneRow[];
  }

  async createZone(storeId: string, zone: Partial<ShelfZoneRow>): Promise<ShelfZoneRow | null> {
    const { data, error } = await supabase
      .from('shelf_zones')
      .insert({ store_id: storeId, ...zone })
      .select()
      .single();
    if (error) return null;
    return data as ShelfZoneRow;
  }

  async updateZone(zoneId: string, updates: Partial<ShelfZoneRow>): Promise<void> {
    await supabase.from('shelf_zones').update(updates).eq('id', zoneId);
  }

  async deleteZone(zoneId: string): Promise<void> {
    await supabase.from('shelf_zones').delete().eq('id', zoneId);
  }

  /** Generate prioritized refill task list with walking route optimization */
  async generateRefillTasks(storeId: string): Promise<RefillTask[]> {
    const zones = await this.getZones(storeId);
    if (zones.length === 0) return [];

    const { data: inventory } = await supabase
      .from('inventory')
      .select('id, product_name, category, current_stock, reorder_point')
      .eq('store_id', storeId)
      .lte('current_stock', 10)
      .gt('current_stock', 0);

    if (!inventory || inventory.length === 0) return [];

    const refillTasks: RefillTask[] = [];

    for (const zone of zones) {
      const zoneProducts = inventory
        .filter((item: any) => item.category === zone.category_affinity || !zone.category_affinity)
        .map((item: any) => ({
          name: item.product_name,
          currentShelf: Math.min(Number(item.current_stock), 3),
          target: Math.min(Number(item.reorder_point || 10), zone.capacity_units),
          refillQty: Math.max(0, Number(item.reorder_point || 10) - Math.min(Number(item.current_stock), 3)),
        }))
        .filter(p => p.refillQty > 0);

      if (zoneProducts.length > 0) {
        refillTasks.push({
          zoneCode: zone.zone_code,
          zoneName: zone.zone_name,
          products: zoneProducts,
          priority: zoneProducts.length > 5 ? 'high' : 'medium',
          walkingOrder: zone.walking_sequence,
        });
      }
    }

    // Sort by walking sequence for optimal route
    return refillTasks.sort((a, b) => a.walkingOrder - b.walkingOrder);
  }

  /** Get walking route as ordered zone codes */
  async getWalkingRoute(storeId: string): Promise<string[]> {
    const tasks = await this.generateRefillTasks(storeId);
    return tasks.map(t => `${t.zoneCode}: ${t.zoneName} (${t.products.length} items)`);
  }
}

export const shelfService = new ShelfService();
