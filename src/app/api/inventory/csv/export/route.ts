import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CsvEngine } from "@/lib/inventory/csv-engine";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const type = searchParams.get("type") || "products";

    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }

    let data: Array<Record<string, unknown>> = [];

    if (type === "products") {
      const { data: inv } = await supabase
        .from("inventory")
        .select("id, product_name, sku:barcode, barcode, category, supplier, price, mrp, current_stock:quantity, unit, expiry_date, status")
        .eq("store_id", storeId)
        .eq("is_archived", false);
      data = inv || [];
    } else if (type === "ledger") {
      const { data: ledger } = await supabase
        .from("inventory_ledger")
        .select("created_at, product_name, transaction_type, previous_stock, change_amount, new_stock, notes")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      data = ledger || [];
    }

    const csvContent = CsvEngine.exportToCsv(data);

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="forecastify-${type}-${Date.now()}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
