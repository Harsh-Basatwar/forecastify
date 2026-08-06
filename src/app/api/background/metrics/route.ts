import { NextResponse } from "next/server";
import { metricsCollector } from "@/lib/background/metrics";

export async function GET() {
  const summary = metricsCollector.getMetricsSummary();
  return NextResponse.json({ success: true, summary });
}
