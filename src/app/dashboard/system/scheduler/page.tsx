"use client";

import { useEffect, useState } from "react";
import { Clock, Play, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { ScheduledTask } from "@/lib/background/scheduler";

export default function SchedulerDashboardPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/scheduler");
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function triggerManual(taskId: string) {
    await fetch("/api/background/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    fetchTasks();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="w-7 h-7 text-accent" />
            Enterprise Scheduler Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cron, event-triggered, priority, dependency, and batch schedules for autonomous operations.
          </p>
        </div>
        <button
          onClick={fetchTasks}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Scheduler
        </button>
      </div>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-accent/10 text-accent">
                {task.cronExpression}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${task.isEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                {task.isEnabled ? "ACTIVE" : "DISABLED"}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground">{task.taskName}</h3>
            <p className="text-xs text-muted-foreground font-mono">Job: {task.jobType}</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Total Runs: <span className="font-semibold text-foreground">{task.totalRuns}</span></div>
              <div>Last Run: <span className="font-semibold text-foreground">{task.lastRunAt ? new Date(task.lastRunAt).toLocaleTimeString() : "—"}</span></div>
              <div>Next Run: <span className="font-semibold text-accent">{new Date(task.nextRunAt).toLocaleTimeString()}</span></div>
            </div>
            <button
              onClick={() => triggerManual(task.id)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-card/80 border border-border/60 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Play className="w-3.5 h-3.5" /> Run Schedule Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
