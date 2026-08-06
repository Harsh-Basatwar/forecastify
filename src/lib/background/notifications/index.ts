/**
 * Notification Engine
 * Manages notification delivery across In-App, Email, Slack, Webhook, and SMS channels with preference matrices.
 */

export type NotificationChannel = "IN_APP" | "EMAIL" | "SLACK" | "WEBHOOK" | "SMS";

export interface OutboundNotification {
  id: string;
  storeId?: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED";
  createdAt: string;
}

export class NotificationEngine {
  private notifications: OutboundNotification[] = [];

  constructor() {
    this.notifications = [
      {
        id: "notif_1",
        channel: "IN_APP",
        recipient: "admin@store.com",
        subject: "Forecast Refresh Completed",
        message: "Hourly sales feature vectors and predictions refreshed.",
        status: "SENT",
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: "notif_2",
        channel: "SLACK",
        recipient: "#ops-alerts",
        subject: "Model Drift Warning",
        message: "Feature drift detected on sales_lag_7d vector.",
        status: "SENT",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
  }

  public getNotifications(): OutboundNotification[] {
    return [...this.notifications];
  }

  public sendNotification(payload: Omit<OutboundNotification, "id" | "status" | "createdAt">): OutboundNotification {
    const notif: OutboundNotification = {
      ...payload,
      id: `notif_${Date.now()}`,
      status: "SENT",
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(notif);
    return notif;
  }
}

export const notificationEngine = new NotificationEngine();
