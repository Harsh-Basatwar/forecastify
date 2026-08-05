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

    const { data: settings } = await supabase
      .from("purchase_settings")
      .select("*")
      .eq("store_id", storeId)
      .single();

    const defaultSettings = settings || {
      store_id: storeId,
      auto_approval_threshold: 50000.0,
      approval_workflow_enabled: true,
      default_payment_terms: "Net 30",
      po_prefix: "PO-",
      grn_prefix: "GRN-",
    };

    return NextResponse.json({ settings: defaultSettings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch purchase settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { storeId, autoApprovalThreshold, approvalWorkflowEnabled, defaultPaymentTerms, poPrefix, grnPrefix } = body;

    if (!storeId) {
      return NextResponse.json({ error: "Missing required storeId parameter." }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("purchase_settings")
      .upsert({
        store_id: storeId,
        auto_approval_threshold: autoApprovalThreshold !== undefined ? autoApprovalThreshold : 50000.0,
        approval_workflow_enabled: approvalWorkflowEnabled !== undefined ? approvalWorkflowEnabled : true,
        default_payment_terms: defaultPaymentTerms || "Net 30",
        po_prefix: poPrefix || "PO-",
        grn_prefix: grnPrefix || "GRN-",
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update purchase settings" }, { status: 500 });
  }
}
