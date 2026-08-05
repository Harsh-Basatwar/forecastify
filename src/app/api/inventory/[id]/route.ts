import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!id || !storeId) {
      return NextResponse.json({ error: "id and storeId are required" }, { status: 400 });
    }

    const { data: inv, error: invErr } = await supabase
      .from("inventory")
      .select("*")
      .eq("id", id)
      .eq("store_id", storeId)
      .single();

    if (invErr || !inv) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch batch lineage
    const { data: batches } = await supabase
      .from("product_batches")
      .select("*")
      .eq("store_id", storeId)
      .order("expiry_date", { ascending: true });

    // Fetch ledger history
    const { data: ledger } = await supabase
      .from("inventory_ledger")
      .select("*")
      .eq("store_id", storeId)
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      product: inv,
      batches: batches || [],
      ledger: ledger || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { storeId, ...updates } = body;

    if (!id || !storeId) {
      return NextResponse.json({ error: "id and storeId are required" }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.productName) payload.product_name = updates.productName;
    if (updates.sku) payload.sku = updates.sku;
    if (updates.category) payload.category = updates.category;
    if (updates.brand) payload.brand = updates.brand;
    if (updates.supplier) payload.supplier = updates.supplier;
    if (updates.sellingPrice !== undefined) payload.price = parseFloat(updates.sellingPrice);
    if (updates.mrp !== undefined) payload.mrp = parseFloat(updates.mrp);
    if (updates.purchasePrice !== undefined) payload.purchase_price = parseFloat(updates.purchasePrice);
    if (updates.currentStock !== undefined) {
      payload.current_stock = parseFloat(updates.currentStock);
      payload.available_stock = parseFloat(updates.currentStock);
    }
    if (updates.minStock !== undefined) payload.min_stock = parseFloat(updates.minStock);
    if (updates.maxStock !== undefined) payload.max_stock = parseFloat(updates.maxStock);
    if (updates.reorderPoint !== undefined) payload.reorder_point = parseFloat(updates.reorderPoint);
    if (updates.status) payload.status = updates.status;
    if (updates.expiryDate !== undefined) payload.expiry_date = updates.expiryDate;

    const { data: updated, error } = await supabase
      .from("inventory")
      .update(payload)
      .eq("id", id)
      .eq("store_id", storeId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!id || !storeId) {
      return NextResponse.json({ error: "id and storeId required" }, { status: 400 });
    }

    // Soft delete / Archive
    const { error } = await supabase
      .from("inventory")
      .update({ is_archived: true, status: "ARCHIVED", deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("store_id", storeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Product archived successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
