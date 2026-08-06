import { NextResponse } from "next/server";
import { jobQueue } from "@/lib/background/queue";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as any;
  const storeId = searchParams.get("storeId") || undefined;
  const jobType = searchParams.get("jobType") || undefined;

  const jobs = jobQueue.listJobs({ status, storeId, jobType });
  const metrics = jobQueue.getQueueMetrics();

  return NextResponse.json({ success: true, count: jobs.length, jobs, metrics });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const job = jobQueue.enqueue({
      storeId: body.storeId || "default-store-id",
      jobType: body.jobType || "GENERIC_TASK",
      priority: body.priority || 5,
      payload: body.payload || {},
      maxAttempts: body.maxAttempts || 3,
      scheduledAt: body.scheduledAt || new Date().toISOString(),
      idempotencyKey: body.idempotencyKey,
      correlationId: body.correlationId,
      traceId: body.traceId,
    });
    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;
    if (!id || !action) {
      return NextResponse.json({ success: false, error: "Missing id or action" }, { status: 400 });
    }

    if (action === "RETRY") {
      const job = jobQueue.retryJob(id);
      return NextResponse.json({ success: true, job });
    } else if (action === "CANCEL") {
      const ok = jobQueue.cancelJob(id);
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
