import { NextResponse } from "next/server";
import { auditEngine } from "@/lib/background/audit";

export async function GET() {
  const records = auditEngine.getAuditRecords();
  return NextResponse.json({ success: true, count: records.length, records });
}
