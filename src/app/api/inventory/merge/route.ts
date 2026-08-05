import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, storeId, targetProductId, duplicateProductIds } = body;

    if (!storeId || !targetProductId || !Array.isArray(duplicateProductIds)) {
      return NextResponse.json({ error: "Missing required params: storeId, targetProductId, duplicateProductIds" }, { status: 400 });
    }

    // 1. Fetch Target Product
    const { data: target, error: targetErr } = await supabase
      .from("inventory")
      .select("*")
      .eq("id", targetProductId)
      .eq("store_id", storeId)
      .single();

    if (targetErr || !target) {
      return NextResponse.json({ error: "Target product not found" }, { status: 404 });
    }

    // 2. Fetch Duplicate Products
    const { data: duplicates, error: dupErr } = await supabase
      .from("inventory")
      .select("*")
      .in("id", duplicateProductIds)
      .eq("store_id", storeId);

    if (dupErr || !duplicates) {
      return NextResponse.json({ error: "Duplicate products not found" }, { status: 404 });
    }

    if (action === "preview") {
      const totalCombinedStock = target.current_stock + duplicates.reduce((acc, d) => acc + (d.current_stock || 0), 0);
      const conflicts: string[] = [];

      duplicates.forEach((d) => {
        if (d.barcode && target.barcode && d.barcode !== target.barcode) {
          conflicts.push(`Barcode mismatch: Target (${target.barcode}) vs Duplicate (${d.barcode})`);
        }
      });

      return NextResponse.json({
        targetProduct: target.product_name,
        duplicateCount: duplicates.length,
        currentStock: target.current_stock,
        mergedStock: totalCombinedStock,
        conflicts,
        canMerge: true,
      });
    }

    if (action === "merge") {
      const addedStock = duplicates.reduce((acc, d) => acc + (d.current_stock || 0), 0);
      const newTotalStock = target.current_stock + addedStock;

      // Create Audit Log buffer for undo window
      await supabase.from("inventory_audit_logs").insert({
        store_id: storeId,
        action: "MERGE",
        entity_type: "PRODUCT",
        entity_id: targetProductId,
        old_values: { target, duplicates },
        new_values: { mergedStock: newTotalStock, mergedIds: duplicateProductIds },
        reason: `Merged ${duplicates.length} duplicate products into target ID ${targetProductId}`,
      });

      // Update target stock
      await supabase
        .from("inventory")
        .update({
          current_stock: newTotalStock,
          available_stock: newTotalStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetProductId)
        .eq("store_id", storeId);

      // Soft archive duplicate products
      await supabase
        .from("inventory")
        .update({
          is_archived: true,
          status: "ARCHIVED",
          current_stock: 0,
          available_stock: 0,
          deleted_at: new Date().toISOString(),
        })
        .in("id", duplicateProductIds)
        .eq("store_id", storeId);

      // Re-point ledger entries to target product
      await supabase
        .from("inventory_ledger")
        .update({ product_id: targetProductId, product_name: target.product_name })
        .in("product_id", duplicateProductIds)
        .eq("store_id", storeId);

      return NextResponse.json({
        success: true,
        message: `Successfully merged ${duplicates.length} items into ${target.product_name}`,
        newTotalStock,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'preview' or 'merge'" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
