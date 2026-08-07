/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PurchaseAutomationService — Smart PO Generation with ROI Estimation, Multi-Channel Dispatch & Full Audit Control
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supplierRankingService } from './supplier-ranking-service';
import { whatsAppProvider, emailProvider, pdfProvider } from './providers';

const defaultSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);
const supabase = defaultSupabase;

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
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || defaultSupabase;
  }

  /** Detect products needing orders and generate smart POs */
  async generateSmartPOs(storeId: string): Promise<SmartPO[]> {
    const { data: inventory } = await this.client
      .from('inventory')
      .select('id, product_name, category, current_stock, reorder_point, price, cost_price, gst_rate, supplier_id')
      .eq('store_id', storeId);

    if (!inventory || inventory.length === 0) return [];

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSales } = await supabase
      .from('sale_items')
      .select('product_id, quantity')
      .gte('created_at', weekAgo);

    const demandMap = new Map<string, number>();
    for (const sale of (recentSales || [])) {
      const current = demandMap.get(sale.product_id) || 0;
      demandMap.set(sale.product_id, current + Number(sale.quantity));
    }

    const needsOrder: SmartPOItem[] = [];
    for (const item of inventory) {
      const stock = Number(item.current_stock);
      const reorderPt = Number(item.reorder_point || 10);
      const weeklyDemand = demandMap.get(item.id) || 0;
      const dailyDemand = weeklyDemand / 7;

      if (stock <= reorderPt || stock <= 0) {
        const safetyStock = Math.ceil(dailyDemand * 2);
        const orderQty = Math.max(1, Math.ceil(dailyDemand * 14) + safetyStock - stock);
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

    const ranked = await supplierRankingService.rankSuppliers(storeId);
    const bestSupplier = ranked[0];

    const subtotal = needsOrder.reduce((s, i) => s + i.lineTotal, 0);
    const gstAmount = needsOrder.reduce((s, i) => s + i.gstAmount, 0);
    const totalAmount = subtotal + gstAmount;

    const deliveryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const expectedRevenue = needsOrder.reduce((s, i) => {
      const sellingPrice = i.unitPrice * 1.35;
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
      .select('*, suppliers(name, company_name, phone, email)')
      .eq('store_id', storeId)
      .in('status', ['draft', 'pending_approval'])
      .order('created_at', { ascending: false });

    return data || [];
  }

  /** Approve a pending Purchase Order */
  async approvePO(storeId: string, poId: string, userId?: string): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', poId)
      .eq('store_id', storeId);

    if (!error) {
      await supabase.from('activity_logs').insert({
        user_id: userId || storeId,
        activity_title: 'Purchase Order Approved',
        activity_type: 'purchase_order',
        metadata: { poId, action: 'approve' },
      });
    }

    return !error;
  }

  /** Reject a pending Purchase Order */
  async rejectPO(storeId: string, poId: string, userId?: string, reason?: string): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'rejected',
        notes: reason ? `Rejected: ${reason}` : 'Rejected by store owner',
        updated_at: new Date().toISOString(),
      })
      .eq('id', poId)
      .eq('store_id', storeId);

    if (!error) {
      await supabase.from('activity_logs').insert({
        user_id: userId || storeId,
        activity_title: 'Purchase Order Rejected',
        activity_type: 'purchase_order',
        metadata: { poId, action: 'reject', reason },
      });
    }

    return !error;
  }

  /** Modify quantity / items of a draft or pending PO */
  async modifyPO(storeId: string, poId: string, items: { productId: string; orderQuantity: number; unitPrice: number }[]): Promise<boolean> {
    const subtotal = items.reduce((sum, item) => sum + item.orderQuantity * item.unitPrice, 0);
    const gstAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + gstAmount;

    const { error } = await supabase
      .from('purchase_orders')
      .update({
        subtotal,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', poId)
      .eq('store_id', storeId);

    return !error;
  }

  /** Undo / Cancel a sent PO */
  async undoPOExecution(storeId: string, poId: string): Promise<boolean> {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', poId)
      .eq('store_id', storeId);

    if (!error) {
      await supabase.from('activity_logs').insert({
        user_id: storeId,
        activity_title: 'Purchase Order Execution Undone',
        activity_type: 'purchase_order',
        metadata: { poId, action: 'undo' },
      });
    }

    return !error;
  }

  /** Emergency stop: disables autonomous purchasing and cancels pending auto POs */
  async emergencyStopAutonomousPurchasing(storeId: string): Promise<boolean> {
    await supabase
      .from('autonomous_config')
      .update({ auto_purchase_orders: false, is_enabled: false })
      .eq('store_id', storeId);

    await supabase
      .from('purchase_orders')
      .update({ status: 'cancelled' })
      .eq('store_id', storeId)
      .eq('status', 'pending_approval');

    await supabase.from('activity_logs').insert({
      user_id: storeId,
      activity_title: 'EMERGENCY STOP TRIGGERED',
      activity_type: 'emergency_stop',
      metadata: { timestamp: new Date().toISOString() },
    });

    return true;
  }

  /** Dispatch PO via WhatsApp message provider */
  async dispatchPOViaWhatsApp(storeId: string, poId: string, phone?: string): Promise<{ success: boolean; message: string }> {
    const { data: po } = await this.client
      .from('purchase_orders')
      .select('*, suppliers(name, phone), purchase_order_items(*)')
      .eq('id', poId)
      .single();

    if (!po) return { success: false, message: 'PO not found' };

    const targetPhone = phone || po.suppliers?.phone || '919876543210';
    const body = `📦 *PURCHASE ORDER #${po.po_number}*\nStore Order Request\nTotal Items: ${po.purchase_order_items?.length || 0}\nTotal Amount: ₹${po.total_amount}\nExpected Delivery: ${po.expected_delivery_date}\n\nPlease confirm order receipt.`;

    await whatsAppProvider.sendPOMessage(targetPhone, po);

    await this.client.from('vendor_communications').insert({
      store_id: storeId,
      supplier_id: po.supplier_id,
      po_id: poId,
      channel: 'whatsapp',
      direction: 'outgoing',
      message_type: 'purchase_order',
      body,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    await this.client.from('purchase_orders').update({ status: 'sent' }).eq('id', poId);

    return { success: true, message: `PO #${po.po_number} dispatched to WhatsApp (${targetPhone})` };
  }

  /** Dispatch PO via Email provider */
  async dispatchPOViaEmail(storeId: string, poId: string, email?: string): Promise<{ success: boolean; message: string }> {
    const { data: po } = await this.client
      .from('purchase_orders')
      .select('*, suppliers(name, email), purchase_order_items(*)')
      .eq('id', poId)
      .single();

    if (!po) return { success: false, message: 'PO not found' };

    const targetEmail = email || po.suppliers?.email || 'vendor@supplier.com';
    const subject = `Official Purchase Order #${po.po_number}`;
    const body = `Please process Purchase Order #${po.po_number} for ₹${po.total_amount}. Delivery requested by ${po.expected_delivery_date}.`;

    await emailProvider.sendEmail(targetEmail, subject, body);

    await this.client.from('vendor_communications').insert({
      store_id: storeId,
      supplier_id: po.supplier_id,
      po_id: poId,
      channel: 'email',
      direction: 'outgoing',
      message_type: 'purchase_order',
      subject,
      body,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    await this.client.from('purchase_orders').update({ status: 'sent' }).eq('id', poId);

    return { success: true, message: `PO #${po.po_number} emailed to ${targetEmail}` };
  }

  /** Generate printable PO summary string / PDF mock structure */
  async generatePOPDF(storeId: string, poId: string): Promise<string> {
    const { data: po } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name, company_name), purchase_order_items(*)')
      .eq('id', poId)
      .single();

    if (!po) return 'PO NOT FOUND';

    return `
==================================================
              FORECASTIFY PURCHASE ORDER          
==================================================
PO Number: ${po.po_number}
Date: ${new Date(po.created_at).toLocaleDateString()}
Supplier: ${po.suppliers?.name || 'General Supplier'}
Expected Delivery: ${po.expected_delivery_date}

ITEMS:
${(po.purchase_order_items || []).map((i: any) => `- ${i.product_name}: ${i.quantity} units @ ₹${i.unit_price} = ₹${i.total_price}`).join('\n')}

Subtotal: ₹${po.subtotal}
GST Amount (18%): ₹${po.gst_amount}
TOTAL AMOUNT: ₹${po.total_amount}
==================================================
Status: ${po.status.toUpperCase()}
Auto-generated by Forecastify Autonomous Operating System
`;
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
