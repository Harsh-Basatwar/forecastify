"use client";

import { useEffect, useState } from "react";
import { Zap, RefreshCw, CheckCircle, Radio } from "lucide-react";
import { SystemEventPayload } from "@/lib/background/events";

export default function EventsDashboardPage() {
  const [events, setEvents] = useState<SystemEventPayload[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/events");
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Radio className="w-7 h-7 text-accent" />
            Enterprise Event Bus Stream
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time async event feed across all platform subsystems.
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Event Feed
        </button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-card/80 border-b border-border/60 text-muted-foreground uppercase text-[11px] font-bold">
            <tr>
              <th className="px-4 py-3">Event Type</th>
              <th className="px-4 py-3">Event ID</th>
              <th className="px-4 py-3">Correlation ID</th>
              <th className="px-4 py-3">Payload Snapshot</th>
              <th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {events.map((evt) => (
              <tr key={evt.id} className="hover:bg-card/60 transition-colors">
                <td className="px-4 py-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-accent/10 text-accent">
                    {evt.eventType}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{evt.id}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{evt.correlationId || "—"}</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{JSON.stringify(evt.payload)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(evt.createdAt).toLocaleTimeString()}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No events recorded yet in the live event bus.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
