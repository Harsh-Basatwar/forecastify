import { NextResponse } from "next/server";
import { operationalReports } from "@/lib/background/reports";

export async function GET() {
  const reports = operationalReports.getReports();
  return NextResponse.json({ success: true, count: reports.length, reports });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const report = operationalReports.generateAdHocReport(body.reportType || "DAILY");
    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
