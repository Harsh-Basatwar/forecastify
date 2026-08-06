import { NextResponse } from "next/server";
import { alertEngine } from "@/lib/background/alerts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const severity = searchParams.get("severity") as any;
  const isResolvedStr = searchParams.get("isResolved");
  const isResolved = isResolvedStr === "true" ? true : isResolvedStr === "false" ? false : undefined;

  const alerts = alertEngine.getAlerts({ severity, isResolved });
  return NextResponse.json({ success: true, count: alerts.length, alerts });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const alert = alertEngine.createAlert({
      storeId: body.storeId || "default-store-id",
      title: body.title || "Custom Alert",
      message: body.message || "System alert triggered",
      severity: body.severity || "WARNING",
      subsystem: body.subsystem || "SystemAdmin",
    });
    return NextResponse.json({ success: true, alert }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, resolvedBy } = body;
    const alert = alertEngine.resolveAlert(id, resolvedBy);
    return NextResponse.json({ success: true, alert });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
