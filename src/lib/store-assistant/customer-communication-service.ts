/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CustomerCommunicationService — Automated Customer Messaging via Communication Engine
 */

import { createClient } from '@supabase/supabase-js';
import type { CustomerCommRow, CustomerCommType } from './types';
import { communicationEngine } from '../communication/communication-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export class CustomerCommunicationService {

  async scheduleCommunication(storeId: string, comm: Partial<CustomerCommRow>): Promise<CustomerCommRow | null> {
    const { data, error } = await supabase.from('customer_communications').insert({ store_id: storeId, ...comm }).select().single();
    if (error) return null;
    return data as CustomerCommRow;
  }

  async getScheduled(storeId: string, limit = 50): Promise<CustomerCommRow[]> {
    const { data } = await supabase
      .from('customer_communications')
      .select('*, customers(name, phone)')
      .eq('store_id', storeId)
      .order('scheduled_at', { ascending: true })
      .limit(limit);
    return (data || []).map((c: any) => ({ ...c, customer_name: c.customers?.name })) as CustomerCommRow[];
  }

  async sendScheduledComms(storeId: string): Promise<number> {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('customer_communications')
      .select('*, customers(id, name, phone, store_id)')
      .eq('store_id', storeId)
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (!data || data.length === 0) return 0;

    let count = 0;
    for (const comm of data) {
      const recipientPhone = comm.customers?.phone || '+919876543210';
      const orgId = '00000000-0000-0000-0000-000000000000';

      const thread = await communicationEngine.getOrCreateThread(
        storeId,
        orgId,
        'customer',
        comm.customer_id || 'guest',
        recipientPhone,
        comm.channel || 'whatsapp'
      );

      const dispatchResult = await communicationEngine.dispatchMessage(
        storeId,
        orgId,
        recipientPhone,
        {
          message_type: 'text',
          text: comm.body,
        },
        comm.channel || 'whatsapp',
        'sms',
        thread?.id
      );

      if (dispatchResult.success) {
        await supabase.from('customer_communications').update({ status: 'sent', sent_at: now }).eq('id', comm.id);
        count++;
      } else {
        await supabase.from('customer_communications').update({ status: 'failed' }).eq('id', comm.id);
      }
    }
    return count;
  }

  /** Auto-generate birthday wishes for tomorrow's birthdays */
  async generateBirthdayWishes(storeId: string): Promise<number> {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('store_id', storeId)
      .not('phone', 'is', null);

    if (!customers || customers.length === 0) return 0;

    let count = 0;
    for (const cust of customers) {
      await this.scheduleCommunication(storeId, {
        customer_id: cust.id,
        channel: 'whatsapp',
        comm_type: 'birthday' as CustomerCommType,
        subject: 'Happy Birthday!',
        body: `Happy Birthday ${cust.name}! 🎂 Visit us today for a special birthday discount. — Your Store`,
        scheduled_at: tomorrow.toISOString(),
        auto_generated: true,
      });
      count++;
    }
    return count;
  }

  /** Generate festival wishes */
  async generateFestivalWishes(storeId: string, festivalName: string): Promise<number> {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name')
      .eq('store_id', storeId);

    if (!customers || customers.length === 0) return 0;

    let count = 0;
    for (const cust of customers) {
      await this.scheduleCommunication(storeId, {
        customer_id: cust.id,
        channel: 'whatsapp',
        comm_type: 'festival' as CustomerCommType,
        subject: `Happy ${festivalName}!`,
        body: `Dear ${cust.name}, wishing you a very Happy ${festivalName}! Visit us for special festive offers. 🎉`,
        scheduled_at: new Date().toISOString(),
        auto_generated: true,
      });
      count++;
    }
    return count;
  }

  async getSummary(storeId: string): Promise<{ scheduled: number; sent: number; delivered: number; failed: number }> {
    const { data } = await supabase.from('customer_communications').select('status').eq('store_id', storeId);
    const comms = data || [];
    return {
      scheduled: comms.filter((c: any) => c.status === 'scheduled').length,
      sent: comms.filter((c: any) => c.status === 'sent').length,
      delivered: comms.filter((c: any) => c.status === 'sent' || c.status === 'delivered').length,
      failed: comms.filter((c: any) => c.status === 'failed').length,
    };
  }
}

export const customerCommunicationService = new CustomerCommunicationService();
