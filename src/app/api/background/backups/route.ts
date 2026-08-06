import { NextResponse } from "next/server";
import { backupManager } from "@/lib/background/backup";

export async function GET() {
  const backups = backupManager.getBackups();
  return NextResponse.json({ success: true, count: backups.length, backups });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backup = backupManager.createSnapshot(body.name || `snapshot_${Date.now()}.snap`, body.backupType);
    return NextResponse.json({ success: true, backup }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
