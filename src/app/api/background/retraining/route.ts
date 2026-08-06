import { NextResponse } from "next/server";
import { retrainingOrchestrator } from "@/lib/background/retraining";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || "default-store-id";
  const history = retrainingOrchestrator.getRetrainingHistory(storeId);
  return NextResponse.json({ success: true, count: history.length, history });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, triggerType, storeId } = body;
    if (action === "APPROVE" && id) {
      const item = retrainingOrchestrator.approveDeployment(id);
      return NextResponse.json({ success: true, item });
    }

    const log = retrainingOrchestrator.triggerRetraining(triggerType || "MANUAL", storeId);
    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
