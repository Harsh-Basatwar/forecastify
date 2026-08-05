import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CsvEngine } from "@/lib/inventory/csv-engine";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, storeId, csvContent } = body;

    if (!storeId || !csvContent) {
      return NextResponse.json({ error: "Missing storeId or csvContent" }, { status: 400 });
    }

    const parsedRows = CsvEngine.parseCsv(csvContent);

    if (action === "dryRun") {
      const result = CsvEngine.dryRunValidate(parsedRows);
      return NextResponse.json(result);
    }

    if (action === "commit") {
      const validation = CsvEngine.dryRunValidate(parsedRows);
      const validPreviews = validation.previews.filter((p) => p.action !== "SKIP");

      const insertRows = validPreviews.map((p) => ({
        store_id: storeId,
        product_name: p.product_name,
        barcode: p.barcode || null,
        category: p.category || "General",
        current_stock: p.stock,
        available_stock: p.stock,
        price: p.price,
        unit: "pcs",
        status: "ACTIVE",
      }));

      const { data: inserted, error } = await supabase
        .from("inventory")
        .insert(insertRows)
        .select();

      if (error) {
        return NextResponse.json({ error: `Commit failed: ${error.message}` }, { status: 500 });
      }

      // Record CSV Import Audit Log
      await supabase.from("inventory_audit_logs").insert({
        store_id: storeId,
        action: "IMPORT",
        entity_type: "PRODUCT",
        new_values: { count: inserted?.length || 0 },
        reason: "CSV Product Import committed",
      });

      return NextResponse.json({
        success: true,
        insertedCount: inserted?.length || 0,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'dryRun' or 'commit'" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
