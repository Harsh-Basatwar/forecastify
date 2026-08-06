"use client";

import { useEffect, useState } from "react";
import { Send, RefreshCw, CheckCircle, Mail, MessageSquare, Bell } from "lucide-react";
import { OutboundNotification } from "@/lib/background/notifications";

export default function NotificationsDashboardPage() {
  const [notifications, setNotifications] = useState<OutboundNotification[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Send className="w-7 h-7 text-accent" />
            Notification Queue & Delivery Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-channel notifications (In-App, Email, Slack, Webhooks, SMS).
          </p>
        </div>
        <button
          onClick={fetchNotifications}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Log
        </button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-card/80 border-b border-border/60 text-muted-foreground uppercase text-[11px] font-bold">
            <tr>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Subject / Message</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sent At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {notifications.map((n) => (
              <tr key={n.id} className="hover:bg-card/60 transition-colors">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-accent">
                    {n.channel === "SLACK" && <MessageSquare className="w-3.5 h-3.5" />}
                    {n.channel === "IN_APP" && <Bell className="w-3.5 h-3.5" />}
                    {n.channel === "EMAIL" && <Mail className="w-3.5 h-3.5" />}
                    {n.channel}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-medium text-foreground">{n.recipient}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">{n.subject || "No Subject"}</div>
                  <div>{n.message}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                    {n.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
