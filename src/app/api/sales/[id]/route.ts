import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/sales/[id]
 * Fetches full sale details including items, customer, and payment methods
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing sale ID" }, { status: 400 });
    }

    const { data: sale, error } = await supabase
      .from("sales")
      .select(`
        *,
        customer:customers(*),
        items:sale_items(*),
        payments:sales_payments(*),
        returns:sales_returns(*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: `Database query failed: ${error.message}` }, { status: 500 });
    }

    if (!sale) {
      return NextResponse.json({ error: "Sale transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ sale });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/sales/[id]
 * Processes a refund or cancellation for a sale, restocking inventory if requested
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, reason = "", restock = true, itemsToRefund = [] } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing sale ID" }, { status: 400 });
    }

    const { data: sale, error: fetchErr } = await supabase
      .from("sales")
      .select("*, items:sale_items(*)")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (sale.status === "refunded" || sale.status === "cancelled") {
      return NextResponse.json({ error: `Sale is already ${sale.status}` }, { status: 400 });
    }

    if (action === "refund" || action === "cancel") {
      const newStatus = action === "cancel" ? "cancelled" : "refunded";

      // 1. Update sale status
      await supabase
        .from("sales")
        .update({
          status: newStatus,
          payment_status: "refunded",
          notes: `${sale.notes ? sale.notes + " | " : ""}${action.toUpperCase()}: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      // 2. Restock inventory if restock flag is true
      if (restock && Array.isArray(sale.items)) {
        for (const item of sale.items) {
          if (!item.product_id) continue;

          // Fetch current stock
          const { data: invItem } = await supabase
            .from("inventory")
            .select("current_stock:quantity, product_name")
            .eq("id", item.product_id)
            .maybeSingle();

          if (invItem) {
            const previousStock = Number(invItem.current_stock);
            const changeAmount = Number(item.quantity);
            const newStock = previousStock + changeAmount;

            // Restock item
            await supabase
              .from("inventory")
              .update({ current_stock: newStock })
              .eq("id", item.product_id);

            // Audit log in inventory_ledger
            await supabase.from("inventory_ledger").insert({
              store_id: sale.store_id,
              product_id: item.product_id,
              product_name: item.product_name,
              previous_stock: previousStock,
              change_amount: changeAmount,
              new_stock: newStock,
              transaction_type: "return",
              reference_id: sale.id,
              notes: `Refund restock for ${sale.invoice_number}: ${reason}`,
            });
          }
        }
      }

      // 3. Record return entry in sales_returns
      await supabase.from("sales_returns").insert({
        sale_id: id,
        refund_amount: sale.grand_total,
        reason,
        restock_inventory: restock,
      });

      // 4. Log activity event
      await supabase.from("activity_logs").insert({
        user_id: sale.store_id,
        activity_type: "SALE_REFUNDED",
        activity_title: `Invoice ${sale.invoice_number} ${newStatus}`,
        activity_description: `Refunded ₹${sale.grand_total}. Reason: ${reason || "Customer request"}`,
        metadata: { invoice_number: sale.invoice_number, amount: sale.grand_total, restock },
      });

      return NextResponse.json({
        success: true,
        message: `Sale ${sale.invoice_number} successfully marked as ${newStatus}.`,
      });
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
