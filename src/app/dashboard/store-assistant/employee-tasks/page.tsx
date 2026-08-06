/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListChecks, ArrowLeft, CheckCircle2, Clock, Plus, UserCheck } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";
import { cn } from "@/lib/utils";

export default function EmployeeTasksPage() {
  const { callApi } = useStoreAssistant();
  const [tasks, setTasks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    setLoading(true);
    let tList = await callApi("tasks.list", { dateRange: "today" });
    if (!tList || tList.length === 0) {
      tList = await callApi("tasks.generate");
    }
    if (tList) setTasks(tList);

    const sum = await callApi("tasks.summary");
    if (sum) setSummary(sum);
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleStatusChange = async (taskId: string, status: string) => {
    await callApi("tasks.updateStatus", { taskId, status });
    loadTasks();
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ListChecks className="w-6 h-6 text-accent" /> Employee Task Manager
            </h1>
            <p className="text-xs text-muted-foreground">Auto-generated daily tasks based on shelf refills, inventory & expiry</p>
          </div>
        </div>

        <button
          onClick={async () => {
            await callApi("tasks.generate");
            loadTasks();
          }}
          className="px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all"
        >
          Re-generate Today's Tasks
        </button>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="fx-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Total Today</span>
          <div className="text-xl font-extrabold">{summary?.total || 0}</div>
        </div>
        <div className="fx-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Completed</span>
          <div className="text-xl font-extrabold text-emerald-400">{summary?.completed || 0}</div>
        </div>
        <div className="fx-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Pending</span>
          <div className="text-xl font-extrabold text-amber-400">{summary?.pending || 0}</div>
        </div>
        <div className="fx-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Completion Rate</span>
          <div className="text-xl font-extrabold text-accent">{summary?.completionRate || 0}%</div>
        </div>
      </div>

      {/* Task List */}
      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Today's Assigned Task List</h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No tasks scheduled for today.</div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "p-4 rounded-xl border flex items-center justify-between gap-4 transition-all",
                  task.status === "completed" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border/60"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{task.title}</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-[9px] font-bold rounded uppercase",
                        task.priority === "high" || task.priority === "critical" ? "bg-rose-500/20 text-rose-400" : "bg-accent/20 text-accent"
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {task.status !== "completed" ? (
                    <button
                      onClick={() => handleStatusChange(task.id, "completed")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-all"
                    >
                      Mark Complete
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Done
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
