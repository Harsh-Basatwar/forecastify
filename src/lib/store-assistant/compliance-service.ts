/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ComplianceService — Auto GST Computation, ITC, HSN, Filing Status
 */

import { createClient } from '@supabase/supabase-js';
import type { GSTComplianceRow, HSNSummaryItem, GSTMismatch } from './types';
import { GST_FILING_DEADLINES } from './constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export class ComplianceService {

  /** Compute monthly GST from sales + purchase data */
  async computeMonthlyGST(storeId: string, month: number, year: number): Promise<GSTComplianceRow | null> {
    // Check cache
    const { data: existing } = await supabase
      .from('gst_compliance')
      .select('*')
      .eq('store_id', storeId)
      .eq('period_month', month)
      .eq('period_year', year)
      .maybeSingle();

    if (existing) return existing as GSTComplianceRow;

    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    // Sales tax
    const { data: sales } = await supabase
      .from('sales')
      .select('subtotal, tax_amount, grand_total')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', monthStart)
      .lt('created_at', nextMonth);

    const totalSalesTaxable = (sales || []).reduce((s: number, r: any) => s + Number(r.subtotal || 0), 0);
    const totalSalesGST = (sales || []).reduce((s: number, r: any) => s + Number(r.tax_amount || 0), 0);
    const cgstCollected = Math.round(totalSalesGST / 2);
    const sgstCollected = Math.round(totalSalesGST / 2);

    // Purchase tax (ITC)
    const { data: purchases } = await supabase
      .from('purchase_orders')
      .select('subtotal, gst_amount, total_amount')
      .eq('store_id', storeId)
      .in('status', ['delivered', 'completed'])
      .gte('created_at', monthStart)
      .lt('created_at', nextMonth);

    const totalPurchaseTaxable = (purchases || []).reduce((s: number, r: any) => s + Number(r.subtotal || 0), 0);
    const totalPurchaseGST = (purchases || []).reduce((s: number, r: any) => s + Number(r.gst_amount || 0), 0);
    const itcCGST = Math.round(totalPurchaseGST / 2);
    const itcSGST = Math.round(totalPurchaseGST / 2);

    const netLiability = Math.max(0, totalSalesGST - totalPurchaseGST);

    // Filing due date
    const filingDueDate = new Date(year, month, GST_FILING_DEADLINES.gstr3b.dueDay).toISOString().split('T')[0];

    const { data: record, error } = await supabase
      .from('gst_compliance')
      .insert({
        store_id: storeId,
        period_month: month,
        period_year: year,
        total_sales_taxable: Math.round(totalSalesTaxable),
        total_sales_gst: Math.round(totalSalesGST),
        cgst_collected: cgstCollected,
        sgst_collected: sgstCollected,
        igst_collected: 0,
        total_purchase_taxable: Math.round(totalPurchaseTaxable),
        total_purchase_gst: Math.round(totalPurchaseGST),
        itc_cgst: itcCGST,
        itc_sgst: itcSGST,
        itc_igst: 0,
        net_gst_liability: Math.round(netLiability),
        hsn_summary: [],
        gstr1_status: 'pending',
        gstr3b_status: 'pending',
        filing_due_date: filingDueDate,
      })
      .select()
      .single();

    if (error) return null;
    return record as GSTComplianceRow;
  }

  /** Detect mismatches */
  async detectMismatches(storeId: string, month: number, year: number): Promise<GSTMismatch[]> {
    // Compare invoice-level GST with summary
    const mismatches: GSTMismatch[] = [];

    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const { data: sales } = await supabase
      .from('sales')
      .select('invoice_number, subtotal, tax_amount, grand_total')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', monthStart)
      .lt('created_at', nextMonth);

    for (const sale of (sales || [])) {
      const expected = Math.round(Number(sale.subtotal) * 0.18);
      const actual = Number(sale.tax_amount);
      if (Math.abs(expected - actual) > 1) {
        mismatches.push({
          invoiceNumber: sale.invoice_number || 'N/A',
          expectedAmount: expected,
          actualAmount: actual,
          type: 'sales_tax',
          description: `Tax mismatch on invoice ${sale.invoice_number}: expected ₹${expected}, found ₹${actual}`,
        });
      }
    }

    return mismatches;
  }

  /** Get filing deadlines */
  async getFilingDeadlines(storeId: string): Promise<{ filing: string; dueDate: string; status: string; daysUntilDue: number }[]> {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed — previous month
    const year = month === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const filingMonth = month === 0 ? 12 : month;

    const { data: compliance } = await supabase
      .from('gst_compliance')
      .select('gstr1_status, gstr3b_status, filing_due_date')
      .eq('store_id', storeId)
      .eq('period_month', filingMonth)
      .eq('period_year', year)
      .maybeSingle();

    const gstr1Due = new Date(year, filingMonth, GST_FILING_DEADLINES.gstr1.dueDay);
    const gstr3bDue = new Date(year, filingMonth, GST_FILING_DEADLINES.gstr3b.dueDay);

    return [
      {
        filing: 'GSTR-1',
        dueDate: gstr1Due.toISOString().split('T')[0],
        status: compliance?.gstr1_status || 'pending',
        daysUntilDue: Math.ceil((gstr1Due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      },
      {
        filing: 'GSTR-3B',
        dueDate: gstr3bDue.toISOString().split('T')[0],
        status: compliance?.gstr3b_status || 'pending',
        daysUntilDue: Math.ceil((gstr3bDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      },
    ];
  }

  /** Get compliance history */
  async getHistory(storeId: string, months = 12): Promise<GSTComplianceRow[]> {
    const { data } = await supabase
      .from('gst_compliance')
      .select('*')
      .eq('store_id', storeId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(months);

    return (data || []) as GSTComplianceRow[];
  }
}

export const complianceService = new ComplianceService();
