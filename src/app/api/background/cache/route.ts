import { NextResponse } from "next/server";
import { cacheManager } from "@/lib/background/cache";

export async function GET() {
  const metrics = cacheManager.getCacheMetrics();
  return NextResponse.json({ success: true, count: metrics.length, metrics });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { namespace } = body;
    const stat = cacheManager.warmCache(namespace || "ForecastCache");
    return NextResponse.json({ success: true, stat });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get("namespace") || "ForecastCache";
    const ok = cacheManager.invalidateNamespace(namespace);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
