import { NextResponse } from "next/server";
import { workflowEngine } from "@/lib/background/workflows";

export async function GET() {
  const workflows = workflowEngine.getWorkflows();
  return NextResponse.json({ success: true, count: workflows.length, workflows });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const workflow = workflowEngine.triggerWorkflow(body.name || "Custom DAG Workflow", body.storeId);
    return NextResponse.json({ success: true, workflow }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
