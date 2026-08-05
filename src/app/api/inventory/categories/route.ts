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

    const [categoriesRes, brandsRes] = await Promise.all([
      supabase.from("categories").select("*").eq("store_id", storeId).order("name"),
      supabase.from("brands").select("*").eq("store_id", storeId).order("name"),
    ]);

    return NextResponse.json({
      categories: categoriesRes.data || [],
      brands: brandsRes.data || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, storeId, name, parentId, manufacturer, description } = body;

    if (!storeId || !name || !type) {
      return NextResponse.json({ error: "type, storeId, and name required" }, { status: 400 });
    }

    if (type === "category") {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const { data, error } = await supabase
        .from("categories")
        .insert({
          store_id: storeId,
          name,
          slug,
          parent_id: parentId || null,
          description: description || null,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, category: data });
    }

    if (type === "brand") {
      const { data, error } = await supabase
        .from("brands")
        .insert({
          store_id: storeId,
          name,
          manufacturer: manufacturer || null,
          description: description || null,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, brand: data });
    }

    return NextResponse.json({ error: "Invalid type. Must be category or brand" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
