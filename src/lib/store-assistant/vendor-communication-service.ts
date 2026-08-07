/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * VendorCommunicationService — Live Interactive Supplier Messaging & Automation
 */

import { createClient } from '@supabase/supabase-js';
import type { VendorCommRow } from './types';
import { VENDOR_MESSAGE_TEMPLATES } from './constants';
import { communicationEngine } from '../communication/communication-engine';
import { workflowStateEngine } from '../communication/workflow-state-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export class VendorCommunicationService {

  /** Draft or Send a live interactive Purchase Order message */
  async draftMessage(storeId: string, poId: string, channel: 'whatsapp' | 'email' | 'sms' = 'whatsapp'): Promise<VendorCommRow | null> {
    // Get PO and Supplier details
    const { data: po } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(id, name, company_name, phone, email, organization_id)')
      .eq('id', poId)
      .single();

    if (!po || !po.suppliers) return null;

    const supplier = po.suppliers;
    const supplierName = supplier.name || supplier.company_name || 'Supplier';
    const recipientPhone = supplier.phone || supplier.mobile || '+919876543210';
    const orgId = supplier.organization_id || '00000000-0000-0000-0000-000000000000';

    const body = VENDOR_MESSAGE_TEMPLATES.po_send({
      supplierName,
      poNumber: po.po_number,
      itemCount: po.item_count || 0,
      totalAmount: Number(po.total_amount),
      deliveryDate: po.expected_delivery_date || 'earliest',
      storeName: 'Your Store',
    });

    // Resolve or initialize conversation thread
    const thread = await communicationEngine.getOrCreateThread(
      storeId,
      orgId,
      'supplier',
      supplier.id,
      recipientPhone,
      channel,
      `PO #${po.po_number}: ${supplierName}`
    );

    // Initialize workflow state machine
    if (thread) {
      await workflowStateEngine.getOrInitWorkflow(
        storeId,
        thread.id,
        'supplier_po_negotiation',
        'purchase_order',
        po.id,
        'WAITING_SUPPLIER_RESPONSE'
      );
    }

    // Insert legacy audit row into vendor_communications table for backward compatibility
    const { data: commRow } = await supabase
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

    return commRow as VendorCommRow;
  }

  /** Send a live interactive Purchase Order message with buttons */
  async sendMessage(commId: string): Promise<boolean> {
    const { data: comm } = await supabase
      .from('vendor_communications')
      .select('*, suppliers(id, name, company_name, phone, organization_id), purchase_orders(po_number, total_amount)')
      .eq('id', commId)
      .single();

    if (!comm) return false;

    const supplier = comm.suppliers;
    const recipientPhone = supplier?.phone || '+919876543210';
    const orgId = supplier?.organization_id || '00000000-0000-0000-0000-000000000000';

    const thread = await communicationEngine.getOrCreateThread(
      comm.store_id,
      orgId,
      'supplier',
      comm.supplier_id,
      recipientPhone,
      comm.channel || 'whatsapp'
    );

    // Dispatch live message with interactive buttons
    const result = await communicationEngine.dispatchMessage(
      comm.store_id,
      orgId,
      recipientPhone,
      {
        message_type: 'interactive_button',
        text: comm.body,
        buttons: [
          { id: `btn_approve_${comm.po_id}`, title: 'Approve Order' },
          { id: `btn_modify_${comm.po_id}`, title: 'Modify Qty' },
          { id: `btn_reject_${comm.po_id}`, title: 'Reject Order' },
        ],
        associated_entity_type: 'purchase_order',
        associated_entity_id: comm.po_id,
      },
      comm.channel || 'whatsapp',
      'sms', // Channel fallback
      thread?.id
    );

    const now = new Date().toISOString();
    const followUpDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('vendor_communications')
      .update({
        status: result.success ? 'sent' : 'failed',
        sent_at: now,
        next_follow_up_at: followUpDate,
      })
      .eq('id', commId);

    return result.success;
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

  /** Send due follow-ups */
  async sendDueFollowUps(storeId: string): Promise<number> {
    const now = new Date().toISOString();
    const { data: due } = await supabase
      .from('vendor_communications')
      .select('*, suppliers(id, name, company_name, phone, organization_id)')
      .eq('store_id', storeId)
      .in('status', ['sent', 'delivered'])
      .lte('next_follow_up_at', now)
      .lt('follow_up_count', 3);

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

      const recipientPhone = comm.suppliers?.phone || '+919876543210';
      const orgId = comm.suppliers?.organization_id || '00000000-0000-0000-0000-000000000000';

      await communicationEngine.dispatchMessage(
        storeId,
        orgId,
        recipientPhone,
        {
          message_type: 'text',
          text: followUpBody,
        },
        comm.channel || 'whatsapp',
        'sms'
      );

      await supabase
        .from('vendor_communications')
        .update({
          follow_up_count: comm.follow_up_count + 1,
          next_follow_up_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', comm.id);

      count++;
    }

    return count;
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
}

export const vendorCommunicationService = new VendorCommunicationService();
