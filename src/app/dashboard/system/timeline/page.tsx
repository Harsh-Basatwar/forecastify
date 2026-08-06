"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle2, AlertTriangle, Activity, RefreshCw } from "lucide-react";
import { OperationalTimelineItem, operationalTimeline } from "@/lib/background/timeline";

export default function TimelineDashboardPage() {
  const [items, setItems] = useState<OperationalTimelineItem[]>([]);

  useEffect(() => {
    setItems(operationalTimeline.getTimelineItems());
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Clock className="w-7 h-7 text-accent" />
          Operational Timeline Feed
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chronological enterprise timeline of system events, retraining triggers, worker restarts, and alerts.
        </p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="p-4 rounded-xl bg-card/50 border border-border/60 backdrop-blur flex items-start gap-4">
            <div className="p-2 rounded-lg bg-accent/10 text-accent font-mono text-xs font-bold shrink-0">
              {new Date(item.timestamp).toLocaleTimeString()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{item.eventType}</span>
                <span className="text-[10px] font-mono text-muted-foreground">Actor: {item.actor}</span>
              </div>
              <p className="text-sm text-muted-foreground">{item.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
