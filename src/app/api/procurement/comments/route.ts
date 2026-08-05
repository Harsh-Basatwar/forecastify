import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { searchParams } = new URL(req.url);

    const storeId = searchParams.get("storeId");
    const poId = searchParams.get("poId");

    if (!storeId || !poId) {
      return NextResponse.json({ error: "Missing required storeId or poId." }, { status: 400 });
    }

    const { data: comments, error } = await supabase
      .from("purchase_comments")
      .select("*")
      .eq("store_id", storeId)
      .eq("po_id", poId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { storeId, poId, comment, userId, userName } = body;

    if (!storeId || !poId || !comment || !comment.trim()) {
      return NextResponse.json({ error: "Missing required comment parameters." }, { status: 400 });
    }

    const { data: newComment, error } = await supabase
      .from("purchase_comments")
      .insert({
        store_id: storeId,
        po_id: poId,
        user_id: userId || null,
        user_name: userName || "User",
        comment: comment.trim(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment: newComment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to post comment" }, { status: 500 });
  }
}
