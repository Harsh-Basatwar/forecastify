import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OCRPurchaseParser } from "@/lib/procurement/ocr-purchase-parser";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const body = await req.json();

    const { storeId, documentText, rawText } = body;

    if (!storeId) {
      return NextResponse.json({ error: "Missing required storeId parameter." }, { status: 400 });
    }

    // Fetch product catalog for fuzzy item matching
    const { data: products } = await supabase.from("products").select("id, name, barcode").eq("store_id", storeId);

    const catalog = products || [];
    const textToParse = rawText || documentText || "TAX INVOICE\nVendor: Global Foods Traders\nGSTIN: 27AAAAA0000A1Z5\nInvoice No: INV-884920\nProduct: Basmati Rice 5kg - Qty 20 - Price 450";

    const parsedInvoice = OCRPurchaseParser.parseOCRInvoiceText(textToParse, catalog);

    return NextResponse.json({
      success: true,
      parsedInvoice,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process OCR document" }, { status: 500 });
  }
}
