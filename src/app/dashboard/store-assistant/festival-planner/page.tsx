/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PartyPopper, ArrowLeft, Calendar, Play } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function FestivalPlannerPage() {
  const { callApi } = useStoreAssistant();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFestivals = async () => {
    setLoading(true);
    const list = await callApi("festival.upcoming");
    if (list) setUpcoming(list);
    setLoading(false);
  };

  useEffect(() => {
    loadFestivals();
  }, []);

  const handleGeneratePlan = async (name: string, date: string) => {
    await callApi("festival.generatePlan", { festivalName: name, festivalDate: date });
    loadFestivals();
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PartyPopper className="w-6 h-6 text-accent" /> Indian Festival Demand Planner
          </h1>
          <p className="text-xs text-muted-foreground">Diwali, Holi, Eid, Pongal & regional festival demand surges & stock preparation</p>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Upcoming Festivals (Next 60 Days)</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Scanning Indian festival calendar...</div>
        ) : upcoming.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No major festivals in the next 60 days.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((fest) => (
              <div key={fest.name} className="p-5 rounded-xl bg-card border border-border/50 space-y-3 text-xs flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-accent">{fest.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-card border border-border">
                      {fest.daysAway} Days Away
                    </span>
                  </div>
                  <p className="text-muted-foreground">Date: {fest.date} | Lead Time: {fest.leadDays} days</p>
                  <p className="text-emerald-400 font-bold">Demand Multiplier: {fest.demandMultiplier}x</p>
                </div>

                {!fest.existingPlan ? (
                  <button
                    onClick={() => handleGeneratePlan(fest.name, fest.date)}
                    className="w-full py-2 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Auto-Generate Stock Plan
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-400">Preparation Plan Active</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
