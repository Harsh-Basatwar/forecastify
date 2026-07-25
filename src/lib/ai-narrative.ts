import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GROQ_KEYS = [
  process.env.GROQ_API_KEY!,
  process.env.GROQ_API_KEY_2!,
  process.env.GROQ_API_KEY_3!,
].filter(Boolean);

function getGroqClient(keyIndex = 0) {
  const key = GROQ_KEYS[keyIndex] || process.env.GROQ_API_KEY!;
  return new Groq({ apiKey: key });
}

export interface NarrativeResult {
  salesStory: string;
  futureExpectation: string;
  recommendation: string;
  confidence: number;
}

export async function getOrGenerateNarrative(
  userId: string,
  storeName: string,
  city: string,
  inventorySummary: string,
  salesSummary: string,
  weatherSummary: string,
  eventsSummary: string,
  signalsSummary: string,
  lang: string = "en",
  forceRefresh: boolean = false
): Promise<NarrativeResult> {
  const today = new Date().toISOString().split("T")[0];

  try {
    // 1. Check if narrative already exists for today and this store in Supabase
    const { data: cached } = forceRefresh
      ? { data: null }
      : await supabase
          .from("ai_narratives")
          .select("sales_story, future_expectation, recommendation, confidence_score")
          .eq("store_id", userId)
          .gte("created_at", `${today}T00:00:00.000Z`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

    if (cached) {
      return {
        salesStory: cached.sales_story,
        futureExpectation: cached.future_expectation,
        recommendation: cached.recommendation,
        confidence: Number(cached.confidence_score || 0.8),
      };
    }

    // 2. Not cached: Generate using Groq Llama
    const languageMap: Record<string, string> = {
      en: "English",
      hi: "Hindi (हिन्दी)",
      mr: "Marathi (मराठी)",
      ta: "Tamil (தமிழ்)",
      te: "Telugu (తెలుగు)",
      kn: "Kannada (ಕನ್ನಡ)",
      bn: "Bengali (বাংলা)",
      gu: "Gujarati (ગુજરાતી)",
    };
    const targetLang = languageMap[lang] || "English";

    const systemPrompt = `You are an expert retail advisor for a small Indian Kirana shop owner. The owner has a 10th-pass education level.
Use extremely simple, plain language. Do not use business jargon (like CAGR, Volatility, Regression, confidence levels, or CAGR). Explain things like a helpful local neighbor.
Use only the supplied internal data and external factors. External factors include holiday, regional event, geopolitical disruption, catastrophe, weather, and realtime signal context only when present in the input.

Provide your output strictly in JSON format with these exact keys:
{
  "salesStory": "Explain what happened to sales this week and why in 2 simple sentences.",
  "futureExpectation": "What will happen next week in 1-2 simple sentences.",
  "recommendation": "What exact action should the shopkeeper take (e.g. buy 2 more crates of Milk/biscuit cartons) in 1-2 simple sentences.",
  "confidence": 0.85
}

IMPORTANT: Write all text values entirely in ${targetLang}. For example, if target language is Hindi, the salesStory, futureExpectation, and recommendation fields must be in Hindi (Devenagari script).`;

    const userPrompt = `
Store Name: ${storeName}
Store Location: ${city}
Current Stock / Inventory Situation: ${inventorySummary}
Recent Sales Details: ${salesSummary}
Today's Weather & Forecast: ${weatherSummary}
External Factors (holidays, regional events, disruptions, catastrophes): ${eventsSummary}
News/Market Signals: ${signalsSummary}

Generate the JSON narrative now:`;

    let completion: any = null;
    for (let i = 0; i < Math.max(1, GROQ_KEYS.length); i++) {
      try {
        const client = getGroqClient(i);
        completion = await client.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.4,
          max_tokens: 600,
          response_format: { type: "json_object" },
        });
        break;
      } catch (err: any) {
        console.error(`Groq key ${i + 1} failed for narrative:`, err.message);
        if (i === GROQ_KEYS.length - 1) throw err;
      }
    }

    const jsonText = completion?.choices[0]?.message?.content;
    if (!jsonText) throw new Error("Empty response from AI model");

    const result = JSON.parse(jsonText);
    const narrative: NarrativeResult = {
      salesStory: result.salesStory || result.sales_story || "Sales are stable this week.",
      futureExpectation: result.futureExpectation || result.future_expectation || "Demand will remain normal.",
      recommendation: result.recommendation || "Order items as per standard schedule.",
      confidence: Number(result.confidence || result.confidence_score || 0.8),
    };

    // 3. Store in Supabase
    await supabase.from("ai_narratives").insert({
      store_id: userId,
      sales_story: narrative.salesStory,
      future_expectation: narrative.futureExpectation,
      recommendation: narrative.recommendation,
      confidence_score: narrative.confidence,
    });

    return narrative;
  } catch (err: any) {
    console.error("Failed to generate AI narrative:", err.message);
    
    // Fallback narrative in appropriate language (simplified fallback)
    const fallbacks: Record<string, NarrativeResult> = {
      en: {
        salesStory: `${storeName} at ${city}: ${salesSummary}. Inventory status: ${inventorySummary}.`,
        futureExpectation: `${weatherSummary}. External factors: ${eventsSummary}.`,
        recommendation: `Use the stockout and slow-moving lists first. Prioritize low-stock products, then clear high-value overstock before buying more.`,
        confidence: 0.75
      },
      hi: {
        salesStory: "इस हफ्ते बिक्री सामान्य रही और ग्राहकों का आना-जाना लगा रहा।",
        futureExpectation: "अगले हफ्ते भी बिक्री सामान्य रहने की उम्मीद है।",
        recommendation: "चायपत्ती, बिस्कुट और चीनी जैसी रोज़ की चीज़ों का सामान्य स्टॉक रखें।",
        confidence: 0.75
      },
      mr: {
        salesStory: "या आठवड्यात विक्री नेहमीप्रमाणे चांगली राहिली.",
        futureExpectation: "पुढील आठवड्यातही विक्री स्थिर राहण्याची अपेक्षा आहे.",
        recommendation: "चहा, बिस्किटे आणि साखर यांसारख्या रोजच्या वस्तूंचा योग्य साठा ठेवा.",
        confidence: 0.75
      }
    };
    
    return fallbacks[lang] || fallbacks.en;
  }
}
