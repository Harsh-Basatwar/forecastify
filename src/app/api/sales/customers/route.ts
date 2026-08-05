import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/sales/customers
 * Search customers by storeId and query string (name/phone/email)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const query = searchParams.get("query") || "";

    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId query parameter" }, { status: 400 });
    }

    let reqQuery = supabase
      .from("customers")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (query.trim()) {
      reqQuery = reqQuery.or(
        `name.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`
      );
    }

    const { data: customers, error } = await reqQuery;

    if (error) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ customers: customers || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/sales/customers
 * Registers a new customer or updates an existing customer
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeId, name, phone, email, gstin, address } = body;

    if (!storeId || !name) {
      return NextResponse.json({ error: "storeId and name are required" }, { status: 400 });
    }

    // Check if customer with phone already exists for store
    if (phone) {
      const { data: existing } = await supabase
        .from("customers")
        .select("*")
        .eq("store_id", storeId)
        .eq("phone", phone.trim())
        .maybeSingle();

      if (existing) {
        return NextResponse.json({
          customer: existing,
          message: "Customer already exists",
        });
      }
    }

    const { data: newCustomer, error } = await supabase
      .from("customers")
      .insert({
        store_id: storeId,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        gstin: gstin ? gstin.trim() : null,
        address: address ? address.trim() : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `Failed to create customer: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ customer: newCustomer, message: "Customer created successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
