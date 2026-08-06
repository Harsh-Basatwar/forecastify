import { NextResponse } from "next/server";
import { notificationEngine } from "@/lib/background/notifications";

export async function GET() {
  const notifications = notificationEngine.getNotifications();
  return NextResponse.json({ success: true, count: notifications.length, notifications });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const notification = notificationEngine.sendNotification({
      storeId: body.storeId || "default-store-id",
      channel: body.channel || "IN_APP",
      recipient: body.recipient || "admin@store.com",
      subject: body.subject,
      message: body.message || "Notification message",
    });
    return NextResponse.json({ success: true, notification }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
