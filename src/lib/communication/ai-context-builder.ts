/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AIContextBuilder — Assembles 360-degree Operational Context for AI Parsing
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface AIContextData {
  senderType: 'supplier' | 'customer' | 'employee' | 'unknown';
  senderName: string;
  phone: string;
  associatedPO?: {
    poId: string;
    poNumber: string;
    status: string;
    totalAmount: number;
    expectedDeliveryDate: string;
    itemCount: number;
    items?: Array<{ productName: string; quantity: number; unitPrice: number }>;
  };
  associatedKhata?: {
    accountId: string;
    outstandingBalance: number;
    creditLimit: number;
  };
  recentThreadMessages: Array<{ direction: string; text: string; sentAt: string }>;
}

export class AIContextBuilder {
  /**
   * Build complete context bundle for a thread message
   */
  async buildContext(storeId: string, threadId: string, phone: string): Promise<AIContextData> {
    const cleanPhone = phone.replace(/[^\d]/g, '');

    const context: AIContextData = {
      senderType: 'unknown',
      senderName: 'Contact',
      phone: cleanPhone,
      recentThreadMessages: [],
    };

    try {
      // 1. Resolve Supplier or Customer entity
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('*')
        .or(`phone.ilike.%${cleanPhone}%,mobile.ilike.%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (supplier) {
        context.senderType = 'supplier';
        context.senderName = supplier.name || supplier.company_name || 'Supplier';

        // Fetch latest active PO for supplier
        const { data: po } = await supabase
          .from('purchase_orders')
          .select('*, purchase_order_items(product_id, quantity, unit_price, inventory(name))')
          .eq('store_id', storeId)
          .eq('supplier_id', supplier.id)
          .in('status', ['draft', 'ordered', 'sent', 'partial_received'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (po) {
          context.associatedPO = {
            poId: po.id,
            poNumber: po.po_number,
            status: po.status,
            totalAmount: Number(po.total_amount || 0),
            expectedDeliveryDate: po.expected_delivery_date || 'Unspecified',
            itemCount: po.item_count || 0,
            items: (po.purchase_order_items || []).map((i: any) => ({
              productName: i.inventory?.name || 'Item',
              quantity: Number(i.quantity),
              unitPrice: Number(i.unit_price),
            })),
          };
        }
      } else {
        // Check if customer
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .ilike('phone', `%${cleanPhone}%`)
          .limit(1)
          .maybeSingle();

        if (customer) {
          context.senderType = 'customer';
          context.senderName = customer.name || 'Customer';

          // Fetch active Khata account
          const { data: khata } = await supabase
            .from('khata_accounts')
            .select('*')
            .eq('store_id', storeId)
            .eq('customer_id', customer.id)
            .limit(1)
            .maybeSingle();

          if (khata) {
            context.associatedKhata = {
              accountId: khata.id,
              outstandingBalance: Number(khata.outstanding_balance || 0),
              creditLimit: Number(khata.credit_limit || 0),
            };
          }
        }
      }

      // 2. Fetch last 5 messages in thread
      const { data: messages } = await supabase
        .from('messages')
        .select('direction, content, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (messages) {
        context.recentThreadMessages = messages.reverse().map((m: any) => ({
          direction: m.direction,
          text: m.content || '',
          sentAt: m.created_at,
        }));
      }
    } catch (err) {
      console.error('[AIContextBuilder] Error assembling context:', err);
    }

    return context;
  }
}

export const aiContextBuilder = new AIContextBuilder();
