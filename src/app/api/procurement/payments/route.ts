import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { searchParams } = new URL(req.url);

    const storeId = searchParams.get("storeId");
    const poId = searchParams.get("poId");

    if (!storeId) {
      return NextResponse.json({ error: "Missing required storeId parameter." }, { status: 400 });
    }

    let query = supabase
      .from("purchase_payments")
      .select("*, supplier:suppliers(name)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (poId) {
      query = query.eq("po_id", poId);
    }

    const { data: payments, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payments: payments || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { storeId, poId, supplierId, amount, paymentMethod, referenceNo, notes } = body;

    if (!storeId || !poId || !supplierId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment payload. Amount must be positive." }, { status: 400 });
    }

    const paymentNumber = "PAY-" + Date.now().toString().slice(-6);

    const { data: payment, error } = await supabase
      .from("purchase_payments")
      .insert({
        store_id: storeId,
        po_id: poId,
        supplier_id: supplierId,
        payment_number: paymentNumber,
        amount,
        payment_method: paymentMethod || "bank_transfer",
        status: "completed",
        reference_no: referenceNo || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update Supplier Outstanding Balance
    const { data: supplier } = await supabase.from("suppliers").select("outstanding_balance").eq("id", supplierId).single();
    if (supplier) {
      const newBalance = Math.max(0, (supplier.outstanding_balance || 0) - amount);
      await supabase.from("suppliers").update({ outstanding_balance: newBalance }).eq("id", supplierId);
    }

    return NextResponse.json({ success: true, payment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record payment" }, { status: 500 });
  }
}
