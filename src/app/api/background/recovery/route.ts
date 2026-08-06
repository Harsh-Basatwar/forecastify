import { NextResponse } from "next/server";
import { recoveryEngine } from "@/lib/background/recovery";
import { disasterRecovery } from "@/lib/background/disaster";

export async function GET() {
  const circuitBreakers = recoveryEngine.listCircuitBreakers();
  return NextResponse.json({ success: true, circuitBreakers });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = disasterRecovery.executeRecoveryPlan(body.checkpointId);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
