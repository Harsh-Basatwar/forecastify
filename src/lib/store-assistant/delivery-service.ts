/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DeliveryService — Delivery Planning, Route Optimization & Tracking
 */

import { createClient } from '@supabase/supabase-js';
import type { DeliveryOrderRow } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export class DeliveryService {

  async createOrder(storeId: string, order: Partial<DeliveryOrderRow>): Promise<DeliveryOrderRow | null> {
    const { data, error } = await supabase
      .from('delivery_orders')
      .insert({ store_id: storeId, ...order })
      .select()
      .single();
    if (error) return null;
    return data as DeliveryOrderRow;
  }

  async getOrders(storeId: string, status?: string): Promise<DeliveryOrderRow[]> {
    let query = supabase.from('delivery_orders').select('*').eq('store_id', storeId).order('delivery_sequence', { ascending: true });
    if (status) query = query.eq('status', status);
    const { data } = await query.limit(100);
    return (data || []) as DeliveryOrderRow[];
  }

  async updateStatus(orderId: string, status: string): Promise<void> {
    const updates: Record<string, any> = { status };
    if (status === 'picked') updates.picked_at = new Date().toISOString();
    if (status === 'delivered') updates.delivered_at = new Date().toISOString();
    await supabase.from('delivery_orders').update(updates).eq('id', orderId);
  }

  async assignDriver(orderId: string, driverName: string): Promise<void> {
    await supabase.from('delivery_orders').update({ driver_name: driverName, status: 'assigned' }).eq('id', orderId);
  }

  /** Optimize delivery sequence (greedy nearest-neighbor) */
  async optimizeRoute(storeId: string): Promise<DeliveryOrderRow[]> {
    const orders = await this.getOrders(storeId, 'pending');
    // Simple sequence assignment based on priority
    const sorted = orders.sort((a, b) => a.priority - b.priority);
    for (let i = 0; i < sorted.length; i++) {
      await supabase.from('delivery_orders').update({ delivery_sequence: i + 1 }).eq('id', sorted[i].id);
      sorted[i].delivery_sequence = i + 1;
    }
    return sorted;
  }

  async getSummary(storeId: string): Promise<{ pending: number; inTransit: number; delivered: number; totalDistance: number; totalFuelCost: number }> {
    const orders = await this.getOrders(storeId);
    return {
      pending: orders.filter(o => o.status === 'pending' || o.status === 'assigned').length,
      inTransit: orders.filter(o => o.status === 'in_transit').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      totalDistance: orders.reduce((s, o) => s + Number(o.estimated_distance_km || 0), 0),
      totalFuelCost: orders.reduce((s, o) => s + Number(o.estimated_fuel_cost || 0), 0),
    };
  }
}

export const deliveryService = new DeliveryService();
