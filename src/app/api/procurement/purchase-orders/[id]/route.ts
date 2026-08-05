import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: po, error } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(*),
        items:purchase_order_items(*, product:products(name, barcode)),
        timeline:purchase_timeline(*),
        comments:purchase_comments(*),
        attachments:purchase_attachments(*),
        approvals:purchase_approvals(*)
      `)
      .eq("id", id)
      .single();

    if (error || !po) {
      return NextResponse.json({ error: error?.message || "Purchase order not found" }, { status: 404 });
    }

    return NextResponse.json({ po });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch PO details" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { storeId, expectedDeliveryDate, terms, notes, version, items } = body;

    // Optimistic locking check
    const { data: existingPo } = await supabase
      .from("purchase_orders")
      .select("status, version")
      .eq("id", id)
      .single();

    if (!existingPo) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    if (existingPo.status !== "draft" && existingPo.status !== "pending_approval") {
      return NextResponse.json({ error: "Only draft or pending purchase orders can be edited." }, { status: 400 });
    }

    if (version && existingPo.version !== version) {
      return NextResponse.json({ error: "Conflict: Purchase order has been modified by another user." }, { status: 409 });
    }

    const nextVersion = (existingPo.version || 1) + 1;

    // Recalculate totals if items provided
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    if (items && Array.isArray(items)) {
      items.forEach((item: any) => {
        const qty = item.ordered_qty || item.orderedQty || 1;
        const price = item.purchase_price || item.purchasePrice || 0;
        const disc = item.discount || 0;
        const gst = item.gst_rate || item.gstRate || 0;
        const lSub = qty * price - disc;
        subtotal += lSub;
        taxAmount += lSub * (gst / 100);
        discountAmount += disc;
      });
    }

    const totalAmount = subtotal + taxAmount;

    const { data: updatedPo, error: updateErr } = await supabase
      .from("purchase_orders")
      .update({
        expected_delivery_date: expectedDeliveryDate || null,
        terms: terms || "Net 30",
        notes: notes || null,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, po: updatedPo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update PO" }, { status: 500 });
  }
}
