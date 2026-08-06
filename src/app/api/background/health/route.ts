import { NextResponse } from "next/server";
import { healthMonitor } from "@/lib/background/health";

export async function GET() {
  const subsystems = healthMonitor.getSubsystems();
  const overallStatus = healthMonitor.getOverallStatus();
  return NextResponse.json({ success: true, overallStatus, count: subsystems.length, subsystems });
}

export async function POST() {
  const result = healthMonitor.runHealthCheck();
  return NextResponse.json({ success: true, ...result });
}
