import { NextResponse } from "next/server";
import { distributedTracing } from "@/lib/background/tracing";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const traceId = searchParams.get("traceId") || undefined;
  const spans = distributedTracing.getSpans(traceId);
  return NextResponse.json({ success: true, count: spans.length, spans });
}
