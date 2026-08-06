import { NextResponse } from "next/server";
import { driftEngine } from "@/lib/background/drift";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || "default-store-id";
  const reports = driftEngine.getLatestReports(storeId);
  return NextResponse.json({ success: true, count: reports.length, reports });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const report = driftEngine.runDriftAnalysis(body.modelId, body.storeId);
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
