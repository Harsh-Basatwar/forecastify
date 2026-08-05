import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AIProcurementEngine } from "@/lib/procurement/ai-procurement-engine";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { searchParams } = new URL(req.url);

    const storeId = searchParams.get("storeId");
    if (!storeId) {
      return NextResponse.json({ error: "Missing required storeId parameter." }, { status: 400 });
    }

    const engine = new AIProcurementEngine(supabase);
    const recommendations = await engine.generateRecommendations(storeId);

    return NextResponse.json({ recommendations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate AI recommendations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { storeId, recommendation, userId } = body;

    if (!storeId || !recommendation || !recommendation.product_id || !recommendation.recommended_supplier_id) {
      return NextResponse.json({ error: "Invalid recommendation payload." }, { status: 400 });
    }

    const poNumber = "PO-AI-" + Date.now().toString().slice(-6);
    const qty = recommendation.recommended_qty || 10;
    const price = Math.round((recommendation.expected_cost || 500) / qty);
    const subtotal = qty * price;
    const taxAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + taxAmount;

    // Create Purchase Order Header from AI Recommendation
    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert({
        store_id: storeId,
        po_number: poNumber,
        supplier_id: recommendation.recommended_supplier_id,
        status: "draft",
        approval_status: "draft",
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        expected_delivery_date: recommendation.expected_delivery_date,
        notes: `Auto-generated via AI Procurement Engine. Reasoning: ${recommendation.reasoning?.why_reorder || ""}`,
        terms: "Net 30",
        created_by: userId || null,
      })
      .select()
      .single();

    if (poErr || !po) {
      return NextResponse.json({ error: poErr?.message || "Failed to draft PO from recommendation" }, { status: 500 });
    }

    // Insert Item
    await supabase.from("purchase_order_items").insert({
      store_id: storeId,
      po_id: po.id,
      product_id: recommendation.product_id,
      variant_id: recommendation.variant_id || null,
      requested_qty: qty,
      approved_qty: qty,
      ordered_qty: qty,
      purchase_price: price,
      gst_rate: 18,
      expected_delivery_date: recommendation.expected_delivery_date,
    });

    // Timeline Record
    await supabase.from("purchase_timeline").insert({
      store_id: storeId,
      po_id: po.id,
      event_type: "created",
      description: `Draft PO ${poNumber} generated from AI Recommendation center. Expected stockout avoided.`,
      performed_by: "AI Procurement Engine",
    });

    return NextResponse.json({ success: true, po });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to convert recommendation to PO" }, { status: 500 });
  }
}
