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

    const { data: approvals, error } = await supabase
      .from("purchase_orders")
      .select("*, supplier:suppliers(name), items:purchase_order_items(*, product:products(name))")
      .eq("store_id", storeId)
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ approvals: approvals || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch approvals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { storeId, poId, decision, comments, userId, userName } = body;

    if (!storeId || !poId || !decision || !["approved", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "Invalid approval payload." }, { status: 400 });
    }

    const { data: po } = await supabase.from("purchase_orders").select("*").eq("id", poId).single();
    if (!po) {
      return NextResponse.json({ error: "Purchase order not found." }, { status: 404 });
    }

    const newStatus = decision === "approved" ? "approved" : "draft";
    const approvalStatus = decision === "approved" ? "approved" : "rejected";

    await supabase
      .from("purchase_orders")
      .update({
        status: newStatus,
        approval_status: approvalStatus,
        approved_by: decision === "approved" ? userId || null : null,
        approved_at: decision === "approved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", poId);

    await supabase.from("purchase_approvals").insert({
      store_id: storeId,
      po_id: poId,
      step_number: 1,
      approver_id: userId || null,
      approver_name: userName || "Manager",
      status: approvalStatus,
      comments: comments || null,
      decided_at: new Date().toISOString(),
    });

    await supabase.from("purchase_timeline").insert({
      store_id: storeId,
      po_id: poId,
      event_type: decision,
      description: `Purchase order ${po.po_number} ${decision} by ${userName || "Manager"}. ${comments ? `Notes: ${comments}` : ""}`,
      performed_by: userName || "Manager",
    });

    return NextResponse.json({ success: true, status: newStatus, approvalStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process approval" }, { status: 500 });
  }
}
