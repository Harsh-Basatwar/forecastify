"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock } from "lucide-react";

export function ActivityTimeline({ userId }: { userId: string }) {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const fetchActivities = async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(8);
      if (data) setActivities(data);
    };
    fetchActivities();

    // Subscribe to new activities
    const channel = supabase.channel('public:activity_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `user_id=eq.${userId}` }, payload => {
        setActivities(current => [payload.new, ...current].slice(0, 8));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Signal dot per activity type — quiet status language, no colored icon squares
  const getSignal = (type: string) => {
    switch (type) {
      case "LOGIN": return "fx-signal fx-signal-accent";
      case "PRODUCT_ADDED":
      case "PRODUCT_EDITED": return "fx-signal fx-signal-success";
      case "REPORT_DOWNLOADED": return "fx-signal fx-signal-accent";
      case "VOICE_COMMAND": return "fx-signal";
      case "FORECAST_RUN":
      case "ANALYSIS_GENERATED": return "fx-signal fx-signal-accent";
      default: return "fx-signal";
    }
  };

  if (activities.length === 0) return null;

  return (
    <section aria-label="Today's activity" className="fx-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
        <h3 className="fx-display text-[17px] text-foreground">Today&apos;s Activity</h3>
      </div>

      {/* Hairline spine with signal dots */}
      <div className="relative border-l border-border ml-[3px] space-y-5">
        {activities.map((act) => (
          <div key={act.id} className="relative pl-5 fx-fade-in">
            <span
              className={`${getSignal(act.activity_type)} absolute -left-[4px] top-[5px]`}
              style={{ boxShadow: "0 0 0 3px var(--card)" }}
              aria-hidden="true"
            />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-foreground leading-snug">{act.activity_title}</span>
              <span className="fx-num text-[11px] text-muted-foreground shrink-0">
                {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
