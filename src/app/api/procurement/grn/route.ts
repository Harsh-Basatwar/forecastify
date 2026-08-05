import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { InventoryDomainService } from "@/lib/inventory/inventory-domain-service";
import { ProcurementEventBus } from "@/lib/procurement/procurement-event-bus";

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
      .from("goods_received_notes")
      .select("*, supplier:suppliers(name), items:grn_items(*, product:products(name))")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (poId) {
      query = query.eq("po_id", poId);
    }

    const { data: grns, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ grns: grns || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch GRNs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const {
      storeId,
      poId,
      supplierId,
      locationId,
      inspectorId,
      invoiceNumber,
      invoiceAmount,
      notes,
      items,
      userId,
    } = body;

    if (!storeId || !poId || !supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required GRN parameters." }, { status: 400 });
    }

    const grnNumber = "GRN-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);

    // 1. Create Goods Received Note Header
    const { data: grn, error: grnErr } = await supabase
      .from("goods_received_notes")
      .insert({
        store_id: storeId,
        grn_number: grnNumber,
        po_id: poId,
        supplier_id: supplierId,
        location_id: locationId || null,
        inspector_id: inspectorId || userId || null,
        status: "completed",
        invoice_number: invoiceNumber || null,
        invoice_amount: invoiceAmount || 0,
        notes: notes || null,
      })
      .select()
      .single();

    if (grnErr || !grn) {
      return NextResponse.json({ error: grnErr?.message || "Failed to create GRN header" }, { status: 500 });
    }

    // 2. Validate Items & Prepare GRN Line Items
    const grnLineItems = items.map((item: any) => {
      const rec = Math.max(0, Number(item.qtyReceived || item.quantity_received || 0));
      const rej = Math.max(0, Number(item.qtyRejected || item.quantity_rejected || 0));
      const acc = Math.max(0, item.qtyAccepted !== undefined ? Number(item.qtyAccepted) : rec - rej);
      const qStatus = item.qualityStatus || (rej > 0 ? (acc > 0 ? "partial_pass" : "fail") : "pass");

      return {
        store_id: storeId,
        grn_id: grn.id,
        po_item_id: item.poItemId,
        product_id: item.productId,
        variant_id: item.variantId || null,
        batch_number: item.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
        mfg_date: item.mfgDate || null,
        expiry_date: item.expiryDate || new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
        quantity_received: rec,
        quantity_accepted: acc,
        quantity_rejected: rej,
        rejection_reason: item.rejectionReason || null,
        quality_status: qStatus,
        cost_price: Number(item.costPrice || 0),
        notes: item.notes || null,
      };
    });

    const { error: grnItemErr } = await supabase.from("grn_items").insert(grnLineItems);
    if (grnItemErr) {
      return NextResponse.json({ error: grnItemErr.message }, { status: 500 });
    }

    // 3. Central Authority Stock Mutation via InventoryDomainService
    const domainService = new InventoryDomainService(supabase);
    const receiveInput = {
      storeId,
      grnId: grn.id,
      grnNumber,
      poId,
      supplierId,
      locationId,
      inspectorId,
      invoiceNumber,
      userId,
      items: grnLineItems.map((gi) => ({
        poItemId: gi.po_item_id,
        productId: gi.product_id,
        variantId: gi.variant_id,
        batchNumber: gi.batch_number,
        mfgDate: gi.mfg_date,
        expiryDate: gi.expiry_date,
        qtyReceived: gi.quantity_received,
        qtyAccepted: gi.quantity_accepted,
        qtyRejected: gi.quantity_rejected,
        rejectionReason: gi.rejection_reason,
        qualityStatus: gi.quality_status as any,
        costPrice: gi.cost_price,
        notes: gi.notes,
      })),
    };

    const stockResult = await domainService.receiveStock(receiveInput);

    // 4. Update Purchase Order Items received & rejected counts
    const { data: poItems } = await supabase.from("purchase_order_items").select("*").eq("po_id", poId);

    let allReceived = true;
    let anyReceived = false;

    if (poItems) {
      for (const poItem of poItems) {
        const receivedInThisGrn = grnLineItems.find((gi) => gi.po_item_id === poItem.id);
        if (receivedInThisGrn) {
          const newReceivedQty = (poItem.received_qty || 0) + receivedInThisGrn.quantity_accepted;
          const newRejectedQty = (poItem.rejected_qty || 0) + receivedInThisGrn.quantity_rejected;

          await supabase
            .from("purchase_order_items")
            .update({
              received_qty: newReceivedQty,
              rejected_qty: newRejectedQty,
              updated_at: new Date().toISOString(),
            })
            .eq("id", poItem.id);

          if (newReceivedQty > 0) anyReceived = true;
          if (newReceivedQty < poItem.ordered_qty) allReceived = false;
        }
      }
    }

    // 5. Update PO Status
    const newPoStatus = allReceived ? "received" : anyReceived ? "partially_received" : "in_transit";
    await supabase.from("purchase_orders").update({ status: newPoStatus, updated_at: new Date().toISOString() }).eq("id", poId);

    // 6. Record Timeline & Broadcast Events
    await supabase.from("purchase_timeline").insert({
      store_id: storeId,
      po_id: poId,
      grn_id: grn.id,
      event_type: "grn_created",
      description: `GRN ${grnNumber} processed. Received stock updated in inventory ledger via InventoryDomainService. PO status set to '${newPoStatus}'.`,
      performed_by: userId || "Inspector",
    });

    await ProcurementEventBus.emit({
      event: "grn.created",
      grn_id: grn.id,
      po_id: poId,
      supplier_id: supplierId,
      store_id: storeId,
      user_id: userId,
      timestamp: new Date().toISOString(),
      details: { grnNumber, invoiceNumber, newPoStatus, stockResult },
    });

    return NextResponse.json({ success: true, grn, newPoStatus, stockResult });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process GRN" }, { status: 500 });
  }
}
