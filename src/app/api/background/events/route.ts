import { NextResponse } from "next/server";
import { eventBus } from "@/lib/background/events";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filterType = searchParams.get("type") as any;
  const history = eventBus.getHistory(filterType);
  return NextResponse.json({ success: true, count: history.length, events: history });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = await eventBus.publish(body.eventType, body.payload || {}, {
      correlationId: body.correlationId,
      traceId: body.traceId,
      storeId: body.storeId,
    });
    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
