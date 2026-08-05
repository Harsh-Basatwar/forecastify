"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/* Each activity type gets its own signal AND a short written kind, so the
   row still reads correctly when hue is unavailable (WCAG 1.4.1). */
const ACTIVITY_KINDS: Record<string, { signal: string; kind: string }> = {
  LOGIN: { signal: "fx-signal fx-signal-info", kind: "Session" },
  PRODUCT_ADDED: { signal: "fx-signal fx-signal-success", kind: "Inventory" },
  PRODUCT_EDITED: { signal: "fx-signal fx-signal-success", kind: "Inventory" },
  REPORT_DOWNLOADED: { signal: "fx-signal fx-signal-accent", kind: "Report" },
  VOICE_COMMAND: { signal: "fx-signal", kind: "Voice" },
  FORECAST_RUN: { signal: "fx-signal fx-signal-warning", kind: "Forecast" },
  ANALYSIS_GENERATED: { signal: "fx-signal fx-signal-warning", kind: "Analysis" },
};

const FALLBACK_KIND = { signal: "fx-signal", kind: "Activity" };

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

  const describe = (type: string) => ACTIVITY_KINDS[type] ?? FALLBACK_KIND;

  return (
    <section aria-label="Today's activity" className="fx-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
        <h3 className="fx-display text-[17px] text-foreground">Today&apos;s Activity</h3>
      </div>

      {/* Realtime-fed list — new rows arrive without a reload, so they are
          announced politely rather than landing silently. */}
      <div aria-live="polite">
        {activities.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Nothing logged yet today. Activity appears here as you work.
          </p>
        ) : (
          /* Hairline spine with signal dots */
          <div className="relative border-l border-border ml-[3px] space-y-5">
            {activities.map((act) => {
              const { signal, kind } = describe(act.activity_type);
              return (
                <div key={act.id} className="relative pl-5 fx-fade-in">
                  <span
                    className={`${signal} absolute -left-[4px] top-[5px]`}
                    style={{ boxShadow: "0 0 0 3px var(--card)" }}
                    aria-hidden="true"
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-medium text-foreground leading-snug">{act.activity_title}</span>
                    <span className="fx-num text-[11px] text-muted-foreground shrink-0">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="fx-eyebrow block text-[10px] mt-0.5">{kind}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
