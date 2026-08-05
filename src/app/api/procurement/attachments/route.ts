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

    const { data: attachments, error } = await supabase
      .from("purchase_attachments")
      .select("*")
      .eq("store_id", storeId)
      .eq("po_id", poId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attachments: attachments || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch attachments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { storeId, poId, grnId, fileName, fileUrl, fileSize, fileType, userId } = body;

    if (!storeId || !fileName || !fileUrl) {
      return NextResponse.json({ error: "Missing required attachment fields." }, { status: 400 });
    }

    const { data: attachment, error } = await supabase
      .from("purchase_attachments")
      .insert({
        store_id: storeId,
        po_id: poId || null,
        grn_id: grnId || null,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize || 0,
        file_type: fileType || "document",
        uploaded_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, attachment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload attachment" }, { status: 500 });
  }
}
