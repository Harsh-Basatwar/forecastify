import { NextResponse } from "next/server";
import { rateLimiter } from "@/lib/background/ratelimit";

export async function GET() {
  const policies = rateLimiter.getPolicies();
  return NextResponse.json({ success: true, count: policies.length, policies });
}
