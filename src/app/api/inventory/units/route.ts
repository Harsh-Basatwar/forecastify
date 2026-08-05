import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    const { data: units, error } = await supabase
      .from("units")
      .select("*")
      .or(`store_id.is.null,store_id.eq.${storeId || "00000000-0000-0000-0000-000000000000"}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ units: units || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, name, abbreviation, baseUnitId, conversionFactor } = body;

    if (!name || !abbreviation) {
      return NextResponse.json({ error: "name and abbreviation required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("units")
      .insert({
        store_id: storeId || null,
        name,
        abbreviation,
        base_unit_id: baseUnitId || null,
        conversion_factor: parseFloat(conversionFactor || "1.0"),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, unit: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
