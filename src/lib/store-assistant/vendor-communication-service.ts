/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * VendorCommunicationService — Automated Supplier Messaging & Follow-ups
 */

import { createClient } from '@supabase/supabase-js';
import type { VendorCommRow } from './types';
import { VENDOR_MESSAGE_TEMPLATES } from './constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export class VendorCommunicationService {

  /** Draft a message for a PO */
  async draftMessage(storeId: string, poId: string, channel: 'whatsapp' | 'email' = 'whatsapp'): Promise<VendorCommRow | null> {
    // Get PO details
    const { data: po } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name, company_name, phone, email)')
      .eq('id', poId)
      .single();

    if (!po) return null;

    const supplierName = po.suppliers?.name || po.suppliers?.company_name || 'Supplier';
    const body = VENDOR_MESSAGE_TEMPLATES.po_send({
      supplierName,
      poNumber: po.po_number,
      itemCount: po.item_count || 0,
      totalAmount: Number(po.total_amount),
      deliveryDate: po.expected_delivery_date || 'earliest',
      storeName: 'Your Store', // Would come from store settings
    });

    const { data, error } = await supabase
      .from('vendor_communications')
      .insert({
        store_id: storeId,
        supplier_id: po.supplier_id,
        po_id: poId,
        channel,
        direction: 'outgoing',
        message_type: 'po_send',
        subject: `Purchase Order #${po.po_number}`,
        body,
        status: 'draft',
      })
      .select()
      .single();

    if (error) return null;
    return data as VendorCommRow;
  }

  /** Send a drafted message */
  async sendMessage(commId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const followUpDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // +24hrs

    const { error } = await supabase
      .from('vendor_communications')
      .update({
        status: 'sent',
        sent_at: now,
        next_follow_up_at: followUpDate,
      })
      .eq('id', commId);

    // In production: integrate with WhatsApp Business API / email service
    return !error;
  }

  /** Draft and send in one step (for autonomous mode) */
  async draftAndSend(storeId: string, poId: string): Promise<boolean> {
    const draft = await this.draftMessage(storeId, poId);
    if (!draft) return false;
    return this.sendMessage(draft.id);
  }

  /** Schedule follow-up */
  async scheduleFollowUp(commId: string, delayHours = 24): Promise<void> {
    const followUpAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();
    await supabase
      .from('vendor_communications')
      .update({ next_follow_up_at: followUpAt })
      .eq('id', commId);
  }

  /** Send follow-up messages for pending communications */
  async sendDueFollowUps(storeId: string): Promise<number> {
    const now = new Date().toISOString();
    const { data: due } = await supabase
      .from('vendor_communications')
      .select('*, suppliers(name, company_name)')
      .eq('store_id', storeId)
      .in('status', ['sent', 'delivered'])
      .lte('next_follow_up_at', now)
      .lt('follow_up_count', 3); // max 3 follow-ups

    if (!due || due.length === 0) return 0;

    let count = 0;
    for (const comm of due) {
      if (comm.follow_up_count >= comm.max_follow_ups) continue;

      const supplierName = comm.suppliers?.name || comm.suppliers?.company_name || 'Supplier';
      const followUpBody = VENDOR_MESSAGE_TEMPLATES.follow_up({
        supplierName,
        poNumber: comm.po_id || 'N/A',
        sentDate: new Date(comm.sent_at).toLocaleDateString('en-IN'),
        storeName: 'Your Store',
      });

      // Create follow-up communication
      await supabase.from('vendor_communications').insert({
        store_id: storeId,
        supplier_id: comm.supplier_id,
        po_id: comm.po_id,
        channel: comm.channel,
        direction: 'outgoing',
        message_type: 'follow_up',
        subject: `Follow-up: ${comm.subject}`,
        body: followUpBody,
        status: 'sent',
        sent_at: now,
        follow_up_count: comm.follow_up_count + 1,
        next_follow_up_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      });

      // Update original
      await supabase.from('vendor_communications')
        .update({ follow_up_count: comm.follow_up_count + 1, next_follow_up_at: null })
        .eq('id', comm.id);

      count++;
    }

    return count;
  }

  /** Record supplier response */
  async processResponse(commId: string, response: string): Promise<void> {
    await supabase
      .from('vendor_communications')
      .update({
        supplier_response: response,
        response_received_at: new Date().toISOString(),
        status: 'replied',
        next_follow_up_at: null,
      })
      .eq('id', commId);
  }

  /** Get communication history for a supplier */
  async getHistory(storeId: string, supplierId?: string, limit = 50): Promise<VendorCommRow[]> {
    let query = supabase
      .from('vendor_communications')
      .select('*, suppliers(name, company_name)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (supplierId) query = query.eq('supplier_id', supplierId);

    const { data } = await query;
    return (data || []).map((c: any) => ({
      ...c,
      supplier_name: c.suppliers?.name || c.suppliers?.company_name,
    })) as VendorCommRow[];
  }

  /** Compare supplier replies for a PO */
  async compareReplies(poId: string): Promise<any[]> {
    const { data } = await supabase
      .from('vendor_communications')
      .select('*, suppliers(name, company_name)')
      .eq('po_id', poId)
      .eq('status', 'replied');

    return (data || []).map((c: any) => ({
      supplierName: c.suppliers?.name || c.suppliers?.company_name,
      response: c.supplier_response,
      respondedAt: c.response_received_at,
      channel: c.channel,
    }));
  }
}

export const vendorCommunicationService = new VendorCommunicationService();
