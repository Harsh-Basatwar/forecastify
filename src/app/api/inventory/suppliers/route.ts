import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }

    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("store_id", storeId)
      .order("name", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ suppliers: suppliers || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, name, gstin, contactPerson, email, phone, address, leadTimeDays, paymentTerms, rating, notes } = body;

    if (!storeId || !name) {
      return NextResponse.json({ error: "storeId and name required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        store_id: storeId,
        name,
        gstin: gstin || null,
        contact_person: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        lead_time_days: parseInt(leadTimeDays || "3", 10),
        payment_terms: paymentTerms || "Net 30",
        rating: parseFloat(rating || "5.0"),
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, supplier: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
