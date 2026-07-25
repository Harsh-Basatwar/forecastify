import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import Groq from "groq-sdk";

/* eslint-disable @typescript-eslint/no-explicit-any */

const GROQ_KEYS = [
  process.env.GROQ_API_KEY!,
  process.env.GROQ_API_KEY_2!,
  process.env.GROQ_API_KEY_3!,
].filter(Boolean);

function stripHtml(value: string) {
  return value
    ? value.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim().slice(0, 900)
    : "";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeActivity(activity: any) {
  const createdAt = activity.created_at || activity.createdAt || new Date().toISOString();
  return {
    id: activity.id || `${createdAt}-${activity.activity_title || activity.title}`,
    createdAt,
    activityType: activity.activity_type || activity.activityType || "ACTIVITY",
    title: activity.activity_title || activity.title || "Activity",
    description: activity.activity_description || activity.description || "",
    metadata: activity.metadata || {},
  };
}

function fallbackReportHtml(context: {
  activities: any[];
  dashboard: any;
  metrics: any;
  location: string;
}) {
  const topActivities = context.activities.slice(0, 6);
  const stats = context.dashboard?.stats || {};
  const store = context.dashboard?.store || {};
  const items = topActivities.length
    ? topActivities.map((a) => `<li><strong>${escapeHtml(a.title)}</strong>${a.description ? `: ${escapeHtml(stripHtml(a.description))}` : ""}</li>`).join("")
    : "<li>No major feature runs were recorded in the last hour.</li>";

  return `
    <h2>Last Hour Summary</h2>
    <p>${escapeHtml(store.store_name || context.metrics?.storeName || "Your store")} was monitored with ${Number(stats.totalSKUs || context.metrics?.skuCount || 0)} SKUs and a current inventory value of Rs ${Number(stats.totalInventoryValue || context.metrics?.inventoryValue || 0).toLocaleString("en-IN")}.</p>
    <h2>Actions Captured</h2>
    <ul>${items}</ul>
    <h2>Near-Term Expectation</h2>
    <p>Stock risk is currently ${Number(stats.stockoutRisk || 0)} and active inventory alerts are ${Number(stats.activeAlerts || context.metrics?.lowStock || 0)}. Keep the order list and demand-spike products ready for the next sales window.</p>
    <h2>Recommendation</h2>
    <p>Prioritize products flagged by demand analysis, refill low-stock products first, and review slow-moving inventory before placing high-value purchase orders.</p>
  `;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, activities: clientActivities = [], dashboard = null, metrics = null, location = "" } = body;
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: dbActivities, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error("Error fetching activity logs:", error);
    }

    const merged = [...(Array.isArray(clientActivities) ? clientActivities : []), ...(dbActivities || [])]
      .map(normalizeActivity)
      .filter((activity) => new Date(activity.createdAt).getTime() >= new Date(oneHourAgo).getTime());

    const deduped = Array.from(new Map(merged.map((activity) => [activity.id, activity])).values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);

    const stats = dashboard?.stats || {};
    const story = dashboard?.aiNarrative || {};
    const events = dashboard?.externalEvents || dashboard?.events || [];
    const actions = dashboard?.todaysActions || [];
    const productsToOrder = dashboard?.productsToOrder || [];
    const notSelling = dashboard?.productsNotSelling || [];

    const activityContext = deduped.length
      ? deduped.map((a, i) => {
          const metadata = a.metadata ? JSON.stringify(a.metadata).slice(0, 900) : "";
          return `${i + 1}. [${new Date(a.createdAt).toLocaleTimeString("en-IN")}] ${a.activityType}: ${a.title}\nDescription: ${stripHtml(a.description)}\nMetadata: ${metadata}`;
        }).join("\n\n")
      : "No feature activity was recorded in the last hour.";

    const dashboardContext = `
Store: ${dashboard?.store?.store_name || metrics?.storeName || "Store"}
Location: ${location || dashboard?.store?.display_location || stats.dataSource || "Unknown"}
SKUs: ${stats.totalSKUs || metrics?.skuCount || 0}
Inventory value: ${stats.totalInventoryValue || metrics?.inventoryValue || 0}
Forecast sales/revenue: ${stats.predictedRevenue || metrics?.sales || 0}
Stockout risk: ${stats.stockoutRisk || 0}
Active alerts: ${stats.activeAlerts || metrics?.lowStock || 0}
Demand trend: ${stats.demandTrend || 0}
Internal narrative: ${story.salesStory || ""}
External-factor expectation: ${story.futureExpectation || ""}
Recommendation: ${story.recommendation || ""}
External events: ${events.slice(0, 5).map((e: any) => `${e.event_name || e.title || "Event"} (${e.start_date || ""})`).join("; ") || "None"}
Today's actions: ${actions.slice(0, 8).join("; ") || "None"}
Products to order: ${productsToOrder.slice(0, 6).map((p: any) => `${p.name}: order ${p.recommendedQty}`).join("; ") || "None"}
Slow/non-selling products: ${notSelling.slice(0, 6).map((p: any) => `${p.name}: value blocked ${p.moneyBlocked}`).join("; ") || "None"}
`;

    if (!GROQ_KEYS.length) {
      return NextResponse.json({
        title: "Jarvis Last-Hour Report",
        reportHtml: fallbackReportHtml({ activities: deduped, dashboard, metrics, location }),
        generatedAt: new Date().toISOString(),
        activityCount: deduped.length,
        usedGroq: false,
      });
    }

    const prompt = `You are Jarvis, a practical Indian grocery retail advisor. Create a concise report for the store owner based ONLY on the supplied data.

Return JSON only:
{
  "title": "short report title",
  "reportHtml": "<h2>...</h2><p>...</p>"
}

Rules:
- reportHtml must be safe, simple HTML only: h2, h3, p, ul, li, table, thead, tbody, tr, th, td, strong.
- Do not use markdown fences.
- Do not invent sales or product facts. If data is missing, say it was not recorded.
- Explain internal data plus external factors: holidays, events, weather, disruptions, or catastrophe signals when present.
- Include: what changed in the last hour, sales trend narrative, near-future expectation, and clear recommendations.
- Keep it compact enough for a small card and PDF.

LAST-HOUR WEBSITE/JARVIS ACTIVITY:
${activityContext}

DASHBOARD AND STORE CONTEXT:
${dashboardContext}`;

    let completion: any = null;
    for (let i = 0; i < GROQ_KEYS.length; i++) {
      try {
        const groq = new Groq({ apiKey: GROQ_KEYS[i] });
        completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          max_tokens: 1600,
          response_format: { type: "json_object" },
        });
        break;
      } catch (e: any) {
        console.error(`Groq key ${i + 1} failed:`, e.message);
        if (i === GROQ_KEYS.length - 1) throw e;
      }
    }

    const raw = completion?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { title: "Jarvis Last-Hour Report", reportHtml: raw };
    }

    return NextResponse.json({
      title: parsed.title || "Jarvis Last-Hour Report",
      reportHtml: String(parsed.reportHtml || fallbackReportHtml({ activities: deduped, dashboard, metrics, location }))
        .replace(/^```html\n?/, "")
        .replace(/^```\n?/, "")
        .replace(/\n?```$/, ""),
      generatedAt: new Date().toISOString(),
      activityCount: deduped.length,
      usedGroq: true,
    });
  } catch (error: any) {
    console.error("Generate Report Error:", error);
    return NextResponse.json({ error: `Groq report error: ${error.message || "Unknown error"}` }, { status: 500 });
  }
}
