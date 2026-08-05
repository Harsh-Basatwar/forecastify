import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BarcodeEngine } from "@/lib/inventory/barcode-engine";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, productId } = body;

    if (!storeId || !productId) {
      return NextResponse.json({ error: "storeId and productId are required" }, { status: 400 });
    }

    // 1. Fetch original product
    const { data: orig, error: fetchErr } = await supabase
      .from("inventory")
      .select("*")
      .eq("id", productId)
      .eq("store_id", storeId)
      .single();

    if (fetchErr || !orig) {
      return NextResponse.json({ error: "Product to clone not found" }, { status: 404 });
    }

    const clonedName = `${orig.product_name} (Copy)`;
    const newBarcode = BarcodeEngine.generateEAN13();

    // 2. Insert cloned copy
    const { data: cloned, error: insertErr } = await supabase
      .from("inventory")
      .insert({
        store_id: storeId,
        product_name: clonedName,
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        barcode: newBarcode,
        category: orig.category,
        brand: orig.brand,
        supplier: orig.supplier,
        price: orig.price,
        mrp: orig.mrp,
        purchase_price: orig.purchase_price,
        unit: orig.unit,
        current_stock: 0,
        available_stock: 0,
        min_stock: orig.min_stock,
        max_stock: orig.max_stock,
        status: "DRAFT",
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, clonedProduct: cloned });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
