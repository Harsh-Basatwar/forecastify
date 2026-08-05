import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { InventoryDomainService } from "@/lib/inventory/inventory-domain-service";

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

    const { data: returns, error } = await supabase
      .from("purchase_returns")
      .select("*, supplier:suppliers(name)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ returns: returns || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch purchase returns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { storeId, poId, grnId, supplierId, items, reason, userId } = body;

    if (!storeId || !supplierId || !reason || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid purchase return payload." }, { status: 400 });
    }

    const returnNumber = "RMA-" + Date.now().toString().slice(-6);

    let totalAmount = 0;
    const domainService = new InventoryDomainService(supabase);

    for (const item of items) {
      const qty = Math.max(1, Number(item.quantity || 1));
      const price = Math.max(0, Number(item.unitPrice || 0));
      totalAmount += qty * price;

      // Mutate inventory to deduct returned stock safely via adjustStock authority
      await domainService.adjustStock({
        storeId,
        productId: item.productId,
        variantId: item.variantId || undefined,
        batchId: item.batchId || undefined,
        adjustmentType: "damaged",
        quantityChange: -qty,
        reason: `Purchase Return (RMA ${returnNumber}): ${reason}`,
        userId,
      });
    }

    const { data: pReturn, error } = await supabase
      .from("purchase_returns")
      .insert({
        store_id: storeId,
        po_id: poId || null,
        grn_id: grnId || null,
        supplier_id: supplierId,
        return_number: returnNumber,
        total_amount: totalAmount,
        reason,
        status: "approved",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, return: pReturn });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create purchase return" }, { status: 500 });
  }
}
