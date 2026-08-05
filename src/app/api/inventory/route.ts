import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BarcodeEngine } from "@/lib/inventory/barcode-engine";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const query = searchParams.get("query") || "";
    const category = searchParams.get("category") || "";
    const brand = searchParams.get("brand") || "";
    const status = searchParams.get("status") || "";
    const lowStock = searchParams.get("lowStock") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!storeId) {
      return NextResponse.json({ error: "storeId parameter required" }, { status: 400 });
    }

    let invQuery = supabase
      .from("inventory")
      .select("*", { count: "exact" })
      .eq("store_id", storeId)
      .eq("is_archived", false);

    if (query) {
      invQuery = invQuery.or(`product_name.ilike.%${query}%,sku.ilike.%${query}%,category.ilike.%${query}%,brand.ilike.%${query}%`);
    }

    if (category) {
      invQuery = invQuery.eq("category", category);
    }

    if (brand) {
      invQuery = invQuery.eq("brand", brand);
    }

    if (status) {
      invQuery = invQuery.eq("status", status);
    }

    if (lowStock) {
      invQuery = invQuery.lte("current_stock", 10);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: items, count, error } = await invQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: items || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      storeId,
      productName,
      sku,
      barcode,
      category,
      brand,
      supplier,
      purchasePrice,
      sellingPrice,
      mrp,
      gstRate,
      hsnCode,
      unit,
      openingStock,
      minStock,
      maxStock,
      reorderPoint,
      safetyStock,
      expiryDate,
    } = body;

    if (!storeId || !productName) {
      return NextResponse.json({ error: "storeId and productName are required" }, { status: 400 });
    }

    const finalBarcode = barcode || BarcodeEngine.generateEAN13();
    const finalPrice = parseFloat(sellingPrice || mrp || "0");
    const stockQty = parseFloat(openingStock || "0");

    // Create in products table
    const { data: prodData, error: prodErr } = await supabase
      .from("products")
      .insert({
        store_id: storeId,
        name: productName,
        barcode: finalBarcode,
        hsn_code: hsnCode || null,
        gst_rate: parseFloat(gstRate || "0"),
        status: "ACTIVE",
        images: { primary: "", thumbnail: "", gallery: [] },
      })
      .select()
      .single();

    // Create entry in inventory table
    const { data: invData, error: invErr } = await supabase
      .from("inventory")
      .insert({
        store_id: storeId,
        product_name: productName,
        sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
        barcode: finalBarcode,
        category: category || "General",
        brand: brand || "Generic",
        supplier: supplier || "Direct",
        price: finalPrice,
        mrp: parseFloat(mrp || sellingPrice || "0"),
        purchase_price: parseFloat(purchasePrice || "0"),
        unit: unit || "pcs",
        current_stock: stockQty,
        available_stock: stockQty,
        min_stock: parseFloat(minStock || "5"),
        max_stock: parseFloat(maxStock || "100"),
        reorder_point: parseFloat(reorderPoint || "10"),
        safety_stock: parseFloat(safetyStock || "5"),
        expiry_date: expiryDate || null,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (invErr) {
      return NextResponse.json({ error: invErr.message }, { status: 500 });
    }

    // Write initial batch if expiryDate or stock provided
    if (prodData && (expiryDate || stockQty > 0)) {
      await supabase.from("product_batches").insert({
        store_id: storeId,
        product_id: prodData.id,
        batch_number: `BATCH-${Date.now().toString().slice(-6)}`,
        expiry_date: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        cost_price: parseFloat(purchasePrice || "0"),
        purchase_price: parseFloat(purchasePrice || "0"),
        initial_quantity: stockQty,
        current_quantity: stockQty,
        status: "active",
      });
    }

    return NextResponse.json({ success: true, item: invData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
