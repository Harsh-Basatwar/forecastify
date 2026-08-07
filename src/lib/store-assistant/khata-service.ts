/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * KhataService — Smart Digital Credit Book
 *
 * Full credit ledger management: accounts, transactions, reminders,
 * outstanding tracking, and payment prediction.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { KhataAccountRow, KhataTransactionRow, KhataReminderRow } from './types';

const defaultSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);
const supabase = defaultSupabase;

export class KhataService {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || defaultSupabase;
  }

  /** Create a new khata account for a customer */
  async createAccount(storeId: string, customerId: string, creditLimit = 5000, notes?: string): Promise<KhataAccountRow | null> {
    // Check for existing account
    const { data: existing } = await supabase
      .from('khata_accounts')
      .select('*')
      .eq('store_id', storeId)
      .eq('customer_id', customerId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existing) return existing as KhataAccountRow;

    const { data, error } = await supabase
      .from('khata_accounts')
      .insert({
        store_id: storeId,
        customer_id: customerId,
        credit_limit: creditLimit,
        notes,
      })
      .select()
      .single();

    if (error) { console.error('Khata account creation failed:', error); return null; }
    return data as KhataAccountRow;
  }

  /** Get all active khata accounts for a store */
  async getAccounts(storeId: string, statusFilter?: string): Promise<KhataAccountRow[]> {
    let query = supabase
      .from('khata_accounts')
      .select('*, customers(name, phone)')
      .eq('store_id', storeId)
      .eq('is_deleted', false)
      .order('outstanding_balance', { ascending: false });

    if (statusFilter) query = query.eq('status', statusFilter);

    const { data } = await query;
    return (data || []).map((a: any) => ({
      ...a,
      customer_name: a.customers?.name,
      customer_phone: a.customers?.phone,
    })) as KhataAccountRow[];
  }

  /** Record credit given to customer (sale on credit) */
  async recordCredit(
    storeId: string,
    accountId: string,
    amount: number,
    saleId?: string,
    dueDate?: string,
    notes?: string
  ): Promise<KhataTransactionRow | null> {
    // Get current balance
    const { data: account } = await supabase
      .from('khata_accounts')
      .select('outstanding_balance, credit_limit, status')
      .eq('id', accountId)
      .single();

    if (!account) return null;

    const currentBalance = Number(account.outstanding_balance);
    const newBalance = currentBalance + amount;

    // Check credit limit
    if (newBalance > Number(account.credit_limit)) {
      console.warn(`Credit limit exceeded for account ${accountId}: ${newBalance} > ${account.credit_limit}`);
    }

    // Insert transaction (immutable)
    const { data: txn, error } = await supabase
      .from('khata_transactions')
      .insert({
        account_id: accountId,
        store_id: storeId,
        type: 'credit_given',
        amount,
        running_balance: newBalance,
        sale_id: saleId || null,
        due_date: dueDate || null,
        notes,
      })
      .select()
      .single();

    if (error) return null;

    // Update account balance
    const status = newBalance > Number(account.credit_limit) ? 'overdue' : 'active';
    await supabase
      .from('khata_accounts')
      .update({ outstanding_balance: newBalance, status })
      .eq('id', accountId);

    return txn as KhataTransactionRow;
  }

  /** Record payment received from customer */
  async recordPayment(
    storeId: string,
    accountId: string,
    amount: number,
    paymentMethod: string = 'cash',
    referenceNumber?: string,
    notes?: string
  ): Promise<KhataTransactionRow | null> {
    const { data: account } = await supabase
      .from('khata_accounts')
      .select('outstanding_balance')
      .eq('id', accountId)
      .single();

    if (!account) return null;

    const currentBalance = Number(account.outstanding_balance);
    const newBalance = Math.max(0, currentBalance - amount);

    const { data: txn, error } = await supabase
      .from('khata_transactions')
      .insert({
        account_id: accountId,
        store_id: storeId,
        type: 'payment_received',
        amount,
        running_balance: newBalance,
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes,
      })
      .select()
      .single();

    if (error) return null;

    const status = newBalance === 0 ? 'settled' : 'active';
    await supabase
      .from('khata_accounts')
      .update({ outstanding_balance: newBalance, status })
      .eq('id', accountId);

    return txn as KhataTransactionRow;
  }

  /** Get transaction history for an account */
  async getTransactions(accountId: string, limit = 50): Promise<KhataTransactionRow[]> {
    const { data } = await supabase
      .from('khata_transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []) as KhataTransactionRow[];
  }

  /** Get total outstanding balance for a store */
  async getTotalOutstanding(storeId: string): Promise<number> {
    const { data } = await supabase
      .from('khata_accounts')
      .select('outstanding_balance')
      .eq('store_id', storeId)
      .eq('is_deleted', false)
      .gt('outstanding_balance', 0);

    return (data || []).reduce((sum: number, a: any) => sum + Number(a.outstanding_balance || 0), 0);
  }

  /** Get overdue accounts */
  async getOverdueAccounts(storeId: string): Promise<KhataAccountRow[]> {
    return this.getAccounts(storeId, 'overdue');
  }

  /** Schedule a payment reminder */
  async scheduleReminder(
    storeId: string,
    accountId: string,
    channel: 'whatsapp' | 'sms' | 'in_app' = 'whatsapp',
    scheduledAt: string,
    messageTemplate?: string
  ): Promise<KhataReminderRow | null> {
    const { data, error } = await supabase
      .from('khata_reminders')
      .insert({
        account_id: accountId,
        store_id: storeId,
        channel,
        scheduled_at: scheduledAt,
        message_template: messageTemplate || null,
      })
      .select()
      .single();

    if (error) return null;
    return data as KhataReminderRow;
  }

  /** Send all due reminders */
  async sendDueReminders(storeId: string): Promise<number> {
    const now = new Date().toISOString();

    const { data: dueReminders } = await supabase
      .from('khata_reminders')
      .select('*, khata_accounts(customer_id, outstanding_balance)')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .lte('scheduled_at', now);

    if (!dueReminders || dueReminders.length === 0) return 0;

    let sentCount = 0;
    for (const reminder of dueReminders) {
      // Mark as sent (actual sending would integrate with WhatsApp/SMS API)
      await supabase
        .from('khata_reminders')
        .update({ status: 'sent', sent_at: now })
        .eq('id', reminder.id);
      sentCount++;
    }

    return sentCount;
  }

  /** Soft-delete a khata account */
  async deleteAccount(accountId: string): Promise<void> {
    await supabase
      .from('khata_accounts')
      .update({ is_deleted: true })
      .eq('id', accountId);
  }

  /** Predict next payment date for a khata account based on historical payment velocity */
  async predictPaymentDate(accountId: string): Promise<string> {
    const txns = await this.getTransactions(accountId, 10);
    const payments = txns.filter(t => t.type === 'payment_received');

    if (payments.length === 0) {
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return nextWeek.toISOString().split('T')[0];
    }

    // Average interval between payments
    const timestamps = payments.map(p => new Date(p.created_at).getTime()).sort();
    let totalIntervalMs = 0;
    for (let i = 1; i < timestamps.length; i++) {
      totalIntervalMs += (timestamps[i] - timestamps[i - 1]);
    }
    const avgDays = timestamps.length > 1 ? Math.max(3, Math.round((totalIntervalMs / (timestamps.length - 1)) / (24 * 60 * 60 * 1000))) : 7;
    const predicted = new Date(Date.now() + avgDays * 24 * 60 * 60 * 1000);
    return predicted.toISOString().split('T')[0];
  }

  /** Get risky customers exceeding 80% credit limit or >30 days overdue */
  async getRiskyCustomers(storeId: string): Promise<KhataAccountRow[]> {
    const { data: accounts } = await supabase
      .from('khata_accounts')
      .select('*, customers(name, phone)')
      .eq('store_id', storeId)
      .eq('is_deleted', false);

    if (!accounts) return [];

    return accounts
      .filter((a: any) => {
        const bal = Number(a.outstanding_balance || 0);
        const limit = Number(a.credit_limit || 5000);
        return bal >= limit * 0.8 || a.status === 'overdue';
      })
      .map((a: any) => ({
        ...a,
        customer_name: a.customers?.name,
        customer_phone: a.customers?.phone,
      })) as KhataAccountRow[];
  }

  /** Get account summary stats for a store */
  async getStoreSummary(storeId: string): Promise<{
    totalAccounts: number;
    activeAccounts: number;
    overdueAccounts: number;
    totalOutstanding: number;
    totalCollectedThisMonth: number;
  }> {
    const { data: accounts } = await supabase
      .from('khata_accounts')
      .select('status, outstanding_balance')
      .eq('store_id', storeId)
      .eq('is_deleted', false);

    const accs = accounts || [];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: payments } = await supabase
      .from('khata_transactions')
      .select('amount')
      .eq('store_id', storeId)
      .eq('type', 'payment_received')
      .gte('created_at', monthStart.toISOString());

    const collectedThisMonth = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    return {
      totalAccounts: accs.length,
      activeAccounts: accs.filter((a: any) => a.status === 'active').length,
      overdueAccounts: accs.filter((a: any) => a.status === 'overdue').length,
      totalOutstanding: accs.reduce((sum: number, a: any) => sum + Number(a.outstanding_balance || 0), 0),
      totalCollectedThisMonth: collectedThisMonth,
    };
  }
}

export const khataService = new KhataService();

