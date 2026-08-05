import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BarcodeEngine } from "@/lib/inventory/barcode-engine";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, storeId, productIds, payload } = body;

    if (!action || !storeId || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: "Missing required params: action, storeId, productIds array" }, { status: 400 });
    }

    if (action === "archive") {
      const { error } = await supabase
        .from("inventory")
        .update({ is_archived: true, status: "ARCHIVED", deleted_at: new Date().toISOString() })
        .in("id", productIds)
        .eq("store_id", storeId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, count: productIds.length });
    }

    if (action === "restore") {
      const { error } = await supabase
        .from("inventory")
        .update({ is_archived: false, status: "ACTIVE", deleted_at: null })
        .in("id", productIds)
        .eq("store_id", storeId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, count: productIds.length });
    }

    if (action === "delete") {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .in("id", productIds)
        .eq("store_id", storeId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, count: productIds.length });
    }

    if (action === "updateCategory") {
      const { category } = payload || {};
      const { error } = await supabase
        .from("inventory")
        .update({ category, updated_at: new Date().toISOString() })
        .in("id", productIds)
        .eq("store_id", storeId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, count: productIds.length });
    }

    if (action === "updateSupplier") {
      const { supplier } = payload || {};
      const { error } = await supabase
        .from("inventory")
        .update({ supplier, updated_at: new Date().toISOString() })
        .in("id", productIds)
        .eq("store_id", storeId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, count: productIds.length });
    }

    if (action === "generateBarcodes") {
      for (const id of productIds) {
        const barcode = BarcodeEngine.generateEAN13();
        await supabase
          .from("inventory")
          .update({ barcode })
          .eq("id", id)
          .eq("store_id", storeId);
      }
      return NextResponse.json({ success: true, count: productIds.length });
    }

    return NextResponse.json({ error: `Unsupported bulk action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
