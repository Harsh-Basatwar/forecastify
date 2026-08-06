import { NextResponse } from "next/server";
import { workerManager } from "@/lib/background/workers";
import { workerOrchestrator } from "@/lib/background/orchestration";

export async function GET() {
  const workers = workerManager.getWorkers();
  return NextResponse.json({ success: true, count: workers.length, workers });
}

export async function POST() {
  const result = await workerOrchestrator.orchestrateNextPendingJob();
  return NextResponse.json({ success: true, result });
}
