/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PurchaseAutomationService — Smart PO Generation with ROI Estimation
 */

import { createClient } from '@supabase/supabase-js';
import { supplierRankingService } from './supplier-ranking-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface SmartPO {
  supplierId: string;
  supplierName: string;
  items: SmartPOItem[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  expectedDeliveryDate: string;
  justification: string;
  estimatedROI: { investment: number; expectedRevenue: number; roiPct: number };
  poId?: string; // Set after draft creation
}

export interface SmartPOItem {
  productId: string;
  productName: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  forecastDemand: number;
  orderQuantity: number;
  unitPrice: number;
  lineTotal: number;
  gstRate: number;
  gstAmount: number;
  stockoutDays: number;
  reason: string;
}

export class PurchaseAutomationService {

  /** Detect products needing orders and generate smart POs */
  async generateSmartPOs(storeId: string): Promise<SmartPO[]> {
    // Get all inventory items that need ordering
    const { data: inventory } = await supabase
      .from('inventory')
      .select('id, product_name, category, current_stock, reorder_point, price, cost_price, gst_rate, supplier_id')
      .eq('store_id', storeId);

    if (!inventory || inventory.length === 0) return [];

    // Get average daily sales for demand estimation
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSales } = await supabase
      .from('sale_items')
      .select('product_id, quantity')
      .gte('created_at', weekAgo);

    // Build demand map
    const demandMap = new Map<string, number>();
    for (const sale of (recentSales || [])) {
      const current = demandMap.get(sale.product_id) || 0;
      demandMap.set(sale.product_id, current + Number(sale.quantity));
    }

    // Filter items needing reorder
    const needsOrder: SmartPOItem[] = [];
    for (const item of inventory) {
      const stock = Number(item.current_stock);
      const reorderPt = Number(item.reorder_point || 10);
      const weeklyDemand = demandMap.get(item.id) || 0;
      const dailyDemand = weeklyDemand / 7;

      if (stock <= reorderPt || stock <= 0) {
        const leadTimeDays = 3; // Default lead time
        const safetyStock = Math.ceil(dailyDemand * 2);
        const orderQty = Math.max(1, Math.ceil(dailyDemand * 14) + safetyStock - stock); // 2 weeks cover
        const unitPrice = Number(item.cost_price || item.price * 0.7);
        const gstRate = Number(item.gst_rate || 18);
        const lineTotal = orderQty * unitPrice;
        const gstAmount = Math.round(lineTotal * gstRate / 100);
        const stockoutDays = dailyDemand > 0 ? Math.max(0, Math.round(stock / dailyDemand)) : 30;

        needsOrder.push({
          productId: item.id,
          productName: item.product_name,
          category: item.category,
          currentStock: stock,
          reorderPoint: reorderPt,
          forecastDemand: Math.round(dailyDemand * 14),
          orderQuantity: orderQty,
          unitPrice,
          lineTotal,
          gstRate,
          gstAmount,
          stockoutDays,
          reason: stock <= 0
            ? `Out of stock — ${Math.round(dailyDemand)} units/day demand`
            : `Stock ${stock} below reorder point ${reorderPt}`,
        });
      }
    }

    if (needsOrder.length === 0) return [];

    // Group by supplier or create single PO
    const ranked = await supplierRankingService.rankSuppliers(storeId);
    const bestSupplier = ranked[0];

    const subtotal = needsOrder.reduce((s, i) => s + i.lineTotal, 0);
    const gstAmount = needsOrder.reduce((s, i) => s + i.gstAmount, 0);
    const totalAmount = subtotal + gstAmount;

    const deliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Estimate ROI
    const expectedRevenue = needsOrder.reduce((s, i) => {
      const sellingPrice = i.unitPrice * 1.35; // ~35% markup
      return s + i.orderQuantity * sellingPrice;
    }, 0);

    const smartPO: SmartPO = {
      supplierId: bestSupplier?.supplierId || '',
      supplierName: bestSupplier?.supplierName || 'Default Supplier',
      items: needsOrder,
      subtotal: Math.round(subtotal),
      gstAmount: Math.round(gstAmount),
      totalAmount: Math.round(totalAmount),
      expectedDeliveryDate: deliveryDate,
      justification: `${needsOrder.length} items need reordering. ${needsOrder.filter(i => i.stockoutDays <= 2).length} items at critical stockout risk.`,
      estimatedROI: {
        investment: Math.round(totalAmount),
        expectedRevenue: Math.round(expectedRevenue),
        roiPct: totalAmount > 0 ? Math.round(((expectedRevenue - totalAmount) / totalAmount) * 100) : 0,
      },
    };

    return [smartPO];
  }

  /** Create draft PO in the purchase_orders table */
  async createDraftPO(storeId: string, smartPO: SmartPO): Promise<string | null> {
    const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        store_id: storeId,
        po_number: poNumber,
        supplier_id: smartPO.supplierId || null,
        status: 'draft',
        subtotal: smartPO.subtotal,
        gst_amount: smartPO.gstAmount,
        total_amount: smartPO.totalAmount,
        expected_delivery_date: smartPO.expectedDeliveryDate,
        notes: smartPO.justification,
      })
      .select('id')
      .single();

    if (error || !data) return null;

    // Insert PO items
    const poItems = smartPO.items.map(item => ({
      purchase_order_id: data.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.orderQuantity,
      unit_price: item.unitPrice,
      total_price: item.lineTotal,
      gst_rate: item.gstRate,
    }));

    await supabase.from('purchase_order_items').insert(poItems);

    return data.id;
  }

  /** Get all pending smart POs */
  async getPendingPOs(storeId: string): Promise<any[]> {
    const { data } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name, company_name)')
      .eq('store_id', storeId)
      .in('status', ['draft', 'pending_approval'])
      .order('created_at', { ascending: false });

    return data || [];
  }

  /** Detect products that need emergency reordering */
  async detectNeededOrders(storeId: string): Promise<SmartPO[]> {
    return this.generateSmartPOs(storeId);
  }

  /** Execute (send) a PO */
  async executePO(smartPO: SmartPO): Promise<boolean> {
    if (!smartPO.poId) return false;
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'sent' })
      .eq('id', smartPO.poId);
    return !error;
  }
}

export const purchaseAutomationService = new PurchaseAutomationService();
