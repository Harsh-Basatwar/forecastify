import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { VoiceBillingCommand } from "@/lib/types/sales";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/sales/voice-command
 * Architecture endpoint for future Voice-to-Billing parsing using Groq AI / Whisper NLP.
 * Standardized interface accepting raw audio transcript strings like:
 * - "Sell 5 Maggi"
 * - "One Amul Milk 500ml"
 * - "Remove Coke"
 * - "Clear cart"
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, storeId } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "transcript string is required in request payload" },
        { status: 400 }
      );
    }

    const cleanedText = transcript.trim().toLowerCase();

    // Standardized Voice Command Contract Architecture
    const commandResponse: VoiceBillingCommand = {
      raw_transcript: transcript,
      parsed_action: "add_item",
      quantity: 1,
      confidence: 0.95,
    };

    // 1. Check for cart clear command
    if (cleanedText.includes("clear cart") || cleanedText.includes("cancel cart")) {
      commandResponse.parsed_action = "clear_cart";
      return NextResponse.json({ success: true, command: commandResponse });
    }

    // 2. Check for remove item command
    if (cleanedText.startsWith("remove") || cleanedText.startsWith("delete")) {
      commandResponse.parsed_action = "remove_item";
      commandResponse.product_query = cleanedText.replace(/^(remove|delete)\s+/, "");
    } else {
      // 3. Add item command with natural language quantity extraction
      commandResponse.parsed_action = "add_item";

      // Regex matching common billing phrases e.g. "sell 5 maggi", "2 amul milk", "one bisleri"
      const numberWordMap: Record<string, number> = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
      };

      const match = cleanedText.match(/^(?:sell|add)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)?\s*(.+)$/i);
      if (match) {
        const qtyStr = match[1]?.toLowerCase();
        if (qtyStr) {
          commandResponse.quantity = !isNaN(Number(qtyStr))
            ? Number(qtyStr)
            : numberWordMap[qtyStr] || 1;
        }
        commandResponse.product_query = match[2]?.trim();
      } else {
        commandResponse.product_query = cleanedText;
      }
    }

    // 4. Fuzzy match product against store's inventory if storeId is provided
    if (storeId && commandResponse.product_query) {
      const { data: dbItem } = await supabase
        .from("inventory")
        .select("id, product_name, category, price, current_stock:quantity")
        .eq("store_id", storeId)
        .ilike("product_name", `%${commandResponse.product_query}%`)
        .limit(1)
        .maybeSingle();

      if (dbItem) {
        commandResponse.matched_product_name = dbItem.product_name;
        commandResponse.matched_product_id = dbItem.id;
        commandResponse.confidence = 0.98;
      }
    }

    return NextResponse.json({
      success: true,
      command: commandResponse,
      architectureNote: "Voice Billing API architecture ready for Groq LLM / Whisper audio pipeline integration.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
