import { NextResponse } from "next/server";
import { enterpriseScheduler } from "@/lib/background/scheduler";

export async function GET() {
  const tasks = enterpriseScheduler.listTasks();
  return NextResponse.json({ success: true, count: tasks.length, tasks });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, storeId } = body;
    if (!taskId) {
      return NextResponse.json({ success: false, error: "Missing taskId" }, { status: 400 });
    }
    const result = enterpriseScheduler.triggerTaskManually(taskId, storeId);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { taskId, isEnabled } = body;
    const task = enterpriseScheduler.toggleTask(taskId, isEnabled);
    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
