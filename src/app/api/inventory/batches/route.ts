import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const productId = searchParams.get("productId");

    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }

    let query = supabase.from("product_batches").select("*").eq("store_id", storeId);

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data: batches, error } = await query.order("expiry_date", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ batches: batches || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, productId, batchNumber, lotNumber, mfgDate, expiryDate, costPrice, purchasePrice, initialQuantity, supplierId } = body;

    if (!storeId || !productId || !batchNumber || !expiryDate) {
      return NextResponse.json({ error: "storeId, productId, batchNumber, expiryDate required" }, { status: 400 });
    }

    const qty = parseFloat(initialQuantity || "0");

    const { data, error } = await supabase
      .from("product_batches")
      .insert({
        store_id: storeId,
        product_id: productId,
        batch_number: batchNumber,
        lot_number: lotNumber || null,
        mfg_date: mfgDate || null,
        expiry_date: expiryDate,
        cost_price: parseFloat(costPrice || "0"),
        purchase_price: parseFloat(purchasePrice || "0"),
        initial_quantity: qty,
        current_quantity: qty,
        supplier_id: supplierId || null,
        status: "active",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, batch: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
