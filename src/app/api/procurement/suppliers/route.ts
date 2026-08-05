import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("store_id", storeId)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ suppliers: suppliers || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const {
      storeId,
      name,
      gstin,
      contact_person,
      email,
      phone,
      address,
      lead_time_days,
      payment_terms,
      credit_limit,
      bank_name,
      bank_account_no,
      bank_ifsc,
      notes,
    } = body;

    if (!storeId || !name) {
      return NextResponse.json({ error: "Missing required storeId or supplier name." }, { status: 400 });
    }

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .insert({
        store_id: storeId,
        name,
        gstin: gstin || null,
        contact_person: contact_person || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        lead_time_days: lead_time_days || 3,
        payment_terms: payment_terms || "Net 30",
        credit_limit: credit_limit || 0,
        reliability_score: 95.0,
        fill_rate: 98.0,
        bank_name: bank_name || null,
        bank_account_no: bank_account_no || null,
        bank_ifsc: bank_ifsc || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, supplier });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create supplier" }, { status: 500 });
  }
}
