import { NextResponse } from "next/server";
import { performanceProfiler } from "@/lib/background/profiler";

export async function GET() {
  const slowQueries = performanceProfiler.getSlowQueries();
  return NextResponse.json({ success: true, count: slowQueries.length, slowQueries });
}
