import { NextResponse } from "next/server";
import { distributedLockManager } from "@/lib/background/locks";

export async function GET() {
  const locks = distributedLockManager.listLocks();
  return NextResponse.json({ success: true, count: locks.length, locks });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const lockKey = searchParams.get("lockKey");
  const holderId = searchParams.get("holderId") || "";
  if (!lockKey) {
    return NextResponse.json({ success: false, error: "Missing lockKey" }, { status: 400 });
  }
  const ok = distributedLockManager.release(lockKey, holderId);
  return NextResponse.json({ success: ok });
}
