import { NextResponse } from "next/server";
import { configurationRegistry } from "@/lib/background/config";

export async function GET() {
  const configs = configurationRegistry.getAll();
  return NextResponse.json({ success: true, count: configs.length, configs });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const item = configurationRegistry.set(body.key, body.value, body.category, body.description);
    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
