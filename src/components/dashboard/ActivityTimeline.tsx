"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, Download, Package, Activity, LogIn, Mic, Zap } from "lucide-react";

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

  const getIcon = (type: string) => {
    switch (type) {
      case "LOGIN": return <LogIn className="w-4 h-4 text-blue-500" />;
      case "PRODUCT_ADDED": 
      case "PRODUCT_EDITED": return <Package className="w-4 h-4 text-green-500" />;
      case "REPORT_DOWNLOADED": return <Download className="w-4 h-4 text-cyan-500" />;
      case "VOICE_COMMAND": return <Mic className="w-4 h-4 text-purple-500" />;
      case "FORECAST_RUN":
      case "ANALYSIS_GENERATED": return <Zap className="w-4 h-4 text-orange-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (activities.length === 0) return null;

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-6 relative overflow-hidden">
      <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
        <Clock className="w-4 h-4 text-cyan-500" />
        Today's Activity
      </h3>
      
      <div className="relative border-l border-border/50 ml-2 space-y-6">
        {activities.map((act, i) => (
          <div key={act.id} className="relative pl-6 animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-card border-2 border-border/50 flex items-center justify-center shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                {getIcon(act.activity_type)}
                <span className="text-sm font-medium text-foreground">{act.activity_title}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
