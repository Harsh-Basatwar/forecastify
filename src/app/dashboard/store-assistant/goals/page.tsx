/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target, ArrowLeft, Plus, CheckCircle2, TrendingUp } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function GoalsPage() {
  const { callApi } = useStoreAssistant();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = async () => {
    setLoading(true);
    await callApi("goal.updateProgress");
    const list = await callApi("goal.list");
    if (list) setGoals(list);
    setLoading(false);
  };

  useEffect(() => {
    loadGoals();
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="w-6 h-6 text-accent" /> Store Goals & Target Tracker
            </h1>
            <p className="text-xs text-muted-foreground">Set revenue, margin & customer targets with daily AI coaching</p>
          </div>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Active Goals & Progress</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Calculating goal progress...</div>
        ) : goals.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No active goals configured.</div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="p-5 rounded-xl bg-card border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold">{goal.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Target: ₹{goal.target_value.toLocaleString("en-IN")} | Current: ₹{goal.current_value.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-accent/15 text-accent font-bold text-xs">
                    {goal.progress_pct}% Completed
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${goal.progress_pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
