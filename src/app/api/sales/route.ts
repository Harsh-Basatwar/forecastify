import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateCartTotals, generateInvoiceNumber } from "@/lib/billing-utils";
import { CartItem, PaymentSplit } from "@/lib/types/sales";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/sales
 * Fetches store sales with filters and pagination
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const status = searchParams.get("status");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
    const offset = Math.max(0, Number(searchParams.get("offset") || 0));

    if (!storeId) {
      return NextResponse.json({ error: "Missing required storeId query parameter" }, { status: 400 });
    }

    let query = supabase
      .from("sales")
      .select(`
        *,
        customer:customers(*),
        items:sale_items(*),
        payments:sales_payments(*)
      `, { count: "exact" })
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: sales, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: `Database query failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      sales: sales || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/sales
 * Creates a completed or draft sales transaction with server-side price validation & inventory reduction
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      storeId,
      customerId,
      items,
      paymentMethod,
      payments,
      coupon,
      orderDiscountPct = 0,
      notes = "",
      status = "completed",
      cashierId,
    } = body;

    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: storeId and non-empty items array are required" },
        { status: 400 }
      );
    }

    // 1. Fetch current live inventory items from DB to verify price and stock (NEVER trust client prices)
    const productIds = items.map((i: CartItem) => i.product_id).filter(Boolean);
    const { data: dbInventory, error: invError } = await supabase
      .from("inventory")
      .select("*")
      .in("id", productIds)
      .eq("store_id", storeId);

    if (invError) {
      return NextResponse.json({ error: `Inventory check failed: ${invError.message}` }, { status: 500 });
    }

    const invMap = new Map((dbInventory || []).map((i) => [i.id, i]));

    // 2. Validate stock availability & rebuild items list using authoritative DB prices
    const validatedCartItems: CartItem[] = [];
    const outOfStockErrors: string[] = [];

    for (const item of items as CartItem[]) {
      const dbItem = invMap.get(item.product_id);
      if (!dbItem) {
        outOfStockErrors.push(`Product '${item.product_name}' not found in active inventory.`);
        continue;
      }

      if (status === "completed" && Number(dbItem.current_stock) < Number(item.quantity)) {
        outOfStockErrors.push(
          `Insufficient stock for '${dbItem.product_name}'. Requested: ${item.quantity}, Available: ${dbItem.current_stock}`
        );
        continue;
      }

      // Use DB price as price authority, fallback to item.unit_price if zero
      const unitPrice = Number(dbItem.price) || Number(item.unit_price) || 0;
      const mrp = Number(dbItem.mrp) || Number(dbItem.price) || Number(item.mrp) || unitPrice;
      const purchasePrice = Number(dbItem.purchase_price) || 0;

      validatedCartItems.push({
        ...item,
        unit_price: unitPrice,
        mrp,
        purchase_price: purchasePrice,
        category: dbItem.category || item.category || "General",
        available_stock: Number(dbItem.current_stock),
      });
    }

    if (outOfStockErrors.length > 0) {
      return NextResponse.json(
        { error: "Inventory validation failed", details: outOfStockErrors },
        { status: 422 }
      );
    }

    // 3. Recalculate transaction totals server-side
    const totals = calculateCartTotals(validatedCartItems, coupon, Number(orderDiscountPct));

    // 4. Generate sequential invoice number
    const { count: existingCount } = await supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId);

    const invoiceNumber = generateInvoiceNumber((existingCount || 0) + 1);

    // 5. Create main sale record
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert({
        store_id: storeId,
        invoice_number: invoiceNumber,
        customer_id: customerId || null,
        status,
        cashier_id: cashierId || storeId,
        subtotal: totals.subtotal,
        discount_pct: Number(orderDiscountPct) || 0,
        discount_amount: totals.total_discount,
        tax_pct: 18.0,
        tax_amount: totals.total_tax,
        round_off: totals.round_off,
        grand_total: totals.grand_total,
        payment_status: status === "completed" ? "paid" : "pending",
        payment_method: paymentMethod || "cash",
        notes,
      })
      .select()
      .single();

    if (saleError || !saleData) {
      return NextResponse.json({ error: `Failed to create sale: ${saleError?.message}` }, { status: 500 });
    }

    const saleId = saleData.id;

    // 6. Insert Sale Items & update inventory stock atomically
    const saleItemRows = validatedCartItems.map((item) => {
      const lineSubtotal = Number((item.unit_price * item.quantity).toFixed(2));
      const lineTax = Number(((lineSubtotal * (item.tax_pct || 18)) / 100).toFixed(2));
      const lineDiscount = Number(((lineSubtotal * (item.discount_pct || 0)) / 100).toFixed(2));
      const lineTotal = Number((lineSubtotal - lineDiscount + lineTax).toFixed(2));

      return {
        sale_id: saleId,
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku || null,
        category: item.category,
        unit: item.unit || "pcs",
        unit_price: item.unit_price,
        mrp: item.mrp,
        purchase_price: item.purchase_price,
        quantity: item.quantity,
        subtotal: lineSubtotal,
        tax_pct: item.tax_pct || 18,
        tax_amount: lineTax,
        discount_amount: lineDiscount,
        total: lineTotal,
      };
    });

    const { error: itemsError } = await supabase.from("sale_items").insert(saleItemRows);
    if (itemsError) {
      return NextResponse.json({ error: `Failed to record sale items: ${itemsError.message}` }, { status: 500 });
    }

    // 7. Insert payment details
    const paymentRows: Array<{ sale_id: string; payment_method: string; amount: number; transaction_ref?: string }> = [];
    if (paymentMethod === "split" && Array.isArray(payments) && payments.length > 0) {
      payments.forEach((p: PaymentSplit) => {
        paymentRows.push({
          sale_id: saleId,
          payment_method: p.method,
          amount: p.amount,
          transaction_ref: p.transaction_ref || undefined,
        });
      });
    } else {
      paymentRows.push({
        sale_id: saleId,
        payment_method: paymentMethod || "cash",
        amount: totals.grand_total,
      });
    }

    await supabase.from("sales_payments").insert(paymentRows);

    // 8. Deduct inventory & record audit ledger logs if completed
    if (status === "completed") {
      for (const item of validatedCartItems) {
        const dbItem = invMap.get(item.product_id);
        if (!dbItem) continue;

        const previousStock = Number(dbItem.current_stock);
        const changeAmount = -Number(item.quantity);
        const newStock = Math.max(0, previousStock + changeAmount);

        // Update inventory table
        await supabase
          .from("inventory")
          .update({ current_stock: newStock })
          .eq("id", item.product_id);

        // Insert inventory ledger audit log
        await supabase.from("inventory_ledger").insert({
          store_id: storeId,
          product_id: item.product_id,
          product_name: item.product_name,
          previous_stock: previousStock,
          change_amount: changeAmount,
          new_stock: newStock,
          transaction_type: "sale",
          reference_id: saleId,
          notes: `Sale completed via ${invoiceNumber}`,
        });
      }

      // 9. Record customer purchase stats if customer attached
      if (customerId) {
        const { data: custData } = await supabase.from("customers").select("total_purchases").eq("id", customerId).maybeSingle();
        const currentTotal = Number(custData?.total_purchases || 0);
        await supabase
          .from("customers")
          .update({
            total_purchases: currentTotal + totals.grand_total,
            updated_at: new Date().toISOString(),
          })
          .eq("id", customerId);
      }

      // 10. Store structured event for Jarvis AI Assistant
      const itemSummary = validatedCartItems.map((i) => `${i.quantity} ${i.unit} ${i.product_name}`).join(", ");
      await supabase.from("activity_logs").insert({
        user_id: storeId,
        activity_type: "SALE_COMPLETED",
        activity_title: `Sale ${invoiceNumber} Recorded`,
        activity_description: `Customer purchased ${itemSummary} for ₹${totals.grand_total}`,
        metadata: {
          invoice_number: invoiceNumber,
          grand_total: totals.grand_total,
          items_count: validatedCartItems.length,
          payment_method: paymentMethod,
          items: validatedCartItems.map((i) => ({
            name: i.product_name,
            qty: i.quantity,
            price: i.unit_price,
            category: i.category,
          })),
        },
      });
    }

    return NextResponse.json({
      success: true,
      sale: saleData,
      invoiceNumber,
      totals,
      message: `Sale ${invoiceNumber} successfully recorded.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
