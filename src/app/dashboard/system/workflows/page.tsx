"use client";

import { useEffect, useState } from "react";
import { Workflow, Play, RefreshCw, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { WorkflowExecution } from "@/lib/background/workflows";

export default function WorkflowsDashboardPage() {
  const [workflows, setWorkflows] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchWorkflows() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/workflows");
      const data = await res.json();
      if (data.success) {
        setWorkflows(data.workflows);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function handleTrigger() {
    await fetch("/api/background/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "End-to-End Autonomous Pipeline" }),
    });
    fetchWorkflows();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Workflow className="w-7 h-7 text-accent" />
            Workflow Engine (DAG Visualizer)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Temporal / Airflow style DAG execution pipelines with step retries and rollback.
          </p>
        </div>
        <button
          onClick={handleTrigger}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <Play className="w-4 h-4" /> Trigger New Pipeline
        </button>
      </div>

      {workflows.map((wf) => (
        <div key={wf.id} className="p-6 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{wf.name}</h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Correlation ID: {wf.correlationId}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500">
              {wf.status}
            </span>
          </div>

          {/* DAG Visualizer Steps */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {wf.steps.map((step, idx) => (
              <div key={step.stepId} className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-card/80 border border-border/60 flex flex-col gap-1 min-w-[140px]">
                  <span className="text-[10px] font-mono text-accent font-bold uppercase">{step.stepId}</span>
                  <span className="text-xs font-bold text-foreground">{step.name}</span>
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {step.status}
                  </span>
                </div>
                {idx < wf.steps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
