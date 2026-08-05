import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { searchParams } = new URL(req.url);

    const storeId = searchParams.get("storeId");
    const supplierId = searchParams.get("supplierId");

    if (!storeId) {
      return NextResponse.json({ error: "Missing required storeId parameter." }, { status: 400 });
    }

    let query = supabase
      .from("supplier_contracts")
      .select("*, supplier:suppliers(name)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }

    const { data: contracts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contracts: contracts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch supplier contracts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { storeId, supplierId, title, startDate, endDate, paymentTerms, creditLimit, discountPercentage } = body;

    if (!storeId || !supplierId || !title || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required contract fields." }, { status: 400 });
    }

    const contractCode = "CNT-" + Date.now().toString().slice(-6);

    const { data: contract, error } = await supabase
      .from("supplier_contracts")
      .insert({
        store_id: storeId,
        supplier_id: supplierId,
        contract_code: contractCode,
        title,
        start_date: startDate,
        end_date: endDate,
        payment_terms: paymentTerms || "Net 30",
        credit_limit: creditLimit || 0,
        discount_percentage: discountPercentage || 0,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, contract });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create supplier contract" }, { status: 500 });
  }
}
