import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { searchParams } = new URL(req.url);

    const storeId = searchParams.get("storeId");
    const productId = searchParams.get("productId");

    if (!storeId) {
      return NextResponse.json({ error: "Missing required storeId parameter." }, { status: 400 });
    }

    let query = supabase
      .from("supplier_price_history")
      .select("*, supplier:suppliers(name), product:products(name)")
      .eq("store_id", storeId)
      .order("date", { ascending: false });

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data: history, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const priceEntries = history || [];

    // Calculate aggregated metrics
    const prices = priceEntries.map((h) => Number(h.purchase_price)).filter((p) => p > 0);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const averagePrice = prices.length > 0 ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : 0;
    const lastPrice = prices.length > 0 ? prices[0] : 0;

    let priceTrend: "up" | "down" | "stable" = "stable";
    if (prices.length >= 2) {
      if (prices[0] > prices[1]) priceTrend = "up";
      else if (prices[0] < prices[1]) priceTrend = "down";
    }

    return NextResponse.json({
      history: priceEntries,
      summary: {
        lowestPrice,
        highestPrice,
        averagePrice,
        lastPrice,
        priceTrend,
        totalEntries: priceEntries.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch price history" }, { status: 500 });
  }
}
