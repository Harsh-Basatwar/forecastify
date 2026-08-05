import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { InventoryDomainService } from "@/lib/inventory/inventory-domain-service";
import { ProcurementEventBus } from "@/lib/procurement/procurement-event-bus";
import { PurchaseOrderStatus } from "@/lib/procurement/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const VALID_TRANSITIONS: Record<string, PurchaseOrderStatus[]> = {
  draft: ["pending_approval", "approved", "cancelled"],
  pending_approval: ["approved", "draft", "cancelled"],
  approved: ["sent", "cancelled"],
  sent: ["supplier_accepted", "in_transit", "cancelled"],
  supplier_accepted: ["in_transit", "partially_received", "received", "cancelled"],
  in_transit: ["partially_received", "received", "cancelled"],
  partially_received: ["received", "closed", "cancelled"],
  received: ["closed"],
  closed: ["draft"], // Reopen to draft
  cancelled: [],
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { targetStatus, reason, userId, userName } = body as {
      targetStatus: PurchaseOrderStatus;
      reason?: string;
      userId?: string;
      userName?: string;
    };

    if (!targetStatus) {
      return NextResponse.json({ error: "Missing required targetStatus parameter." }, { status: 400 });
    }

    // Fetch current PO and items
    const { data: po, error: fetchErr } = await supabase
      .from("purchase_orders")
      .select("*, items:purchase_order_items(*)")
      .eq("id", id)
      .single();

    if (fetchErr || !po) {
      return NextResponse.json({ error: "Purchase order not found." }, { status: 404 });
    }

    const currentStatus = po.status as PurchaseOrderStatus;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      return NextResponse.json(
        { error: `Invalid transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed.join(", ") || "none"}` },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const updateData: Record<string, any> = {
      status: targetStatus,
      updated_at: timestamp,
    };

    if (targetStatus === "approved") {
      updateData.approval_status = "approved";
      updateData.approved_by = userId || null;
      updateData.approved_at = timestamp;
    } else if (targetStatus === "sent") {
      updateData.sent_at = timestamp;
    } else if (targetStatus === "supplier_accepted") {
      updateData.accepted_at = timestamp;
    } else if (targetStatus === "received") {
      updateData.received_at = timestamp;
    } else if (targetStatus === "closed") {
      updateData.closed_at = timestamp;
    }

    // Execute state update
    const { data: updatedPo, error: updateErr } = await supabase
      .from("purchase_orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Domain Stock Adjustments on Incoming Stock
    const domainService = new InventoryDomainService(supabase);

    if (targetStatus === "approved" || targetStatus === "sent") {
      // Increment incoming stock
      if (po.items && Array.isArray(po.items)) {
        for (const item of po.items) {
          await domainService.updateIncomingStock(po.store_id, item.product_id, item.ordered_qty || item.requested_qty);
        }
      }
    } else if (targetStatus === "cancelled") {
      // Release incoming stock if previously approved/sent
      if (["approved", "sent", "supplier_accepted", "in_transit"].includes(currentStatus)) {
        if (po.items && Array.isArray(po.items)) {
          for (const item of po.items) {
            const remainingIncoming = Math.max(0, (item.ordered_qty || 0) - (item.received_qty || 0));
            await domainService.updateIncomingStock(po.store_id, item.product_id, -remainingIncoming);
          }
        }
      }
    }

    // Write Timeline Record
    await supabase.from("purchase_timeline").insert({
      store_id: po.store_id,
      po_id: po.id,
      event_type: targetStatus,
      description: `Purchase order status transitioned from '${currentStatus}' to '${targetStatus}'. ${reason ? `Reason: ${reason}` : ""}`,
      performed_by: userName || "System",
    });

    // Publish Structured Event
    await ProcurementEventBus.emit({
      event: `purchase.${targetStatus}` as any,
      po_id: po.id,
      supplier_id: po.supplier_id,
      store_id: po.store_id,
      user_id: userId,
      timestamp,
      details: {
        poNumber: po.po_number,
        previousStatus: currentStatus,
        newStatus: targetStatus,
        totalAmount: po.total_amount,
        reason,
      },
    });

    return NextResponse.json({ success: true, po: updatedPo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update PO status" }, { status: 500 });
  }
}
