import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { searchParams } = new URL(req.url);

    const storeId = searchParams.get("storeId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    if (!storeId) {
      return NextResponse.json({ error: "Missing required storeId parameter." }, { status: 400 });
    }

    let query = supabase
      .from("purchase_orders")
      .select("*, supplier:suppliers(id, name, email, phone, gstin, reliability_score), items:purchase_order_items(*, product:products(name, barcode))", { count: "exact" })
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.ilike("po_number", `%${search}%`);
    }

    const { data: orders, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      orders: orders || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch purchase orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { storeId, supplierId, items, terms, notes, expectedDeliveryDate, userId } = body;

    if (!storeId || !supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required storeId, supplierId, or items." }, { status: 400 });
    }

    // Auto-generate PO Number
    const poNumber = "PO-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);

    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    const validatedItems = items.map((item: any) => {
      const qty = Math.max(1, Number(item.requestedQty || item.orderedQty || 1));
      const price = Math.max(0, Number(item.purchasePrice || 0));
      const disc = Math.max(0, Number(item.discount || 0));
      const gst = Math.max(0, Number(item.gstRate || 0));

      const lineSubtotal = qty * price - disc;
      const lineTax = lineSubtotal * (gst / 100);

      subtotal += lineSubtotal;
      taxAmount += lineTax;
      discountAmount += disc;

      return {
        store_id: storeId,
        product_id: item.productId,
        variant_id: item.variantId || null,
        supplier_sku: item.supplierSku || null,
        requested_qty: qty,
        approved_qty: qty,
        ordered_qty: qty,
        received_qty: 0,
        rejected_qty: 0,
        backordered_qty: 0,
        purchase_price: price,
        discount: disc,
        gst_rate: gst,
        expected_delivery_date: item.expectedDeliveryDate || expectedDeliveryDate || null,
        notes: item.notes || null,
      };
    });

    const totalAmount = subtotal + taxAmount;

    // 1. Create Purchase Order Header
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert({
        store_id: storeId,
        po_number: poNumber,
        supplier_id: supplierId,
        status: "draft",
        approval_status: "draft",
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        expected_delivery_date: expectedDeliveryDate || null,
        terms: terms || "Net 30",
        notes: notes || null,
        created_by: userId || null,
        version: 1,
      })
      .select()
      .single();

    if (poErr || !po) {
      return NextResponse.json({ error: poErr?.message || "Failed to create PO header" }, { status: 500 });
    }

    // 2. Create Purchase Order Line Items
    const itemsWithPoId = validatedItems.map((item: any) => ({ ...item, po_id: po.id }));
    const { error: itemErr } = await supabase.from("purchase_order_items").insert(itemsWithPoId);

    if (itemErr) {
      return NextResponse.json({ error: itemErr.message }, { status: 500 });
    }

    // 3. Record Initial Purchase Timeline
    await supabase.from("purchase_timeline").insert({
      store_id: storeId,
      po_id: po.id,
      event_type: "created",
      description: `Purchase order ${poNumber} drafted for total ₹${totalAmount.toLocaleString("en-IN")}`,
      performed_by: userId || "User",
    });

    return NextResponse.json({ success: true, po });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create purchase order" }, { status: 500 });
  }
}
