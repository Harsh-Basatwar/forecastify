import { NextResponse } from "next/server";
import { serviceDiscovery } from "@/lib/background/discovery";

export async function GET() {
  const services = serviceDiscovery.getServices();
  return NextResponse.json({ success: true, count: services.length, services });
}
