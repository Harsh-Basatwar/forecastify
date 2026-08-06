"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PlayCircle, RefreshCw, CheckCircle, AlertTriangle, Clock, XCircle, Filter, RotateCcw } from "lucide-react";
import { BackgroundJob } from "@/lib/background/queue";

export default function BackgroundJobsPage() {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  async function fetchJobs() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/jobs");
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = filterStatus === "ALL" ? jobs : jobs.filter((j) => j.status === filterStatus);

  async function handleRetry(id: string) {
    await fetch("/api/background/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "RETRY" }),
    });
    fetchJobs();
  }

  async function handleCancel(id: string) {
    await fetch("/api/background/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "CANCEL" }),
    });
    fetchJobs();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PlayCircle className="w-7 h-7 text-accent" />
            Background Jobs Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise background processing queue, execution states, and dead-letter queue management.
          </p>
        </div>
        <button
          onClick={fetchJobs}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Console
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card/60 border border-border/60 backdrop-blur">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Total Tracked Jobs</div>
          <div className="text-2xl font-bold mt-1 text-foreground">{jobs.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-card/60 border border-border/60 backdrop-blur">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Running Jobs</div>
          <div className="text-2xl font-bold mt-1 text-amber-500">{jobs.filter((j) => j.status === "RUNNING").length}</div>
        </div>
        <div className="p-4 rounded-xl bg-card/60 border border-border/60 backdrop-blur">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Succeeded</div>
          <div className="text-2xl font-bold mt-1 text-emerald-500">{jobs.filter((j) => j.status === "SUCCEEDED").length}</div>
        </div>
        <div className="p-4 rounded-xl bg-card/60 border border-border/60 backdrop-blur">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Failed / DLQ</div>
          <div className="text-2xl font-bold mt-1 text-rose-500">{jobs.filter((j) => j.status === "FAILED").length}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/40">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {["ALL", "QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "WAITING"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              filterStatus === st ? "bg-accent text-accent-foreground" : "bg-card/40 text-muted-foreground hover:bg-card/80"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-card/80 border-b border-border/60 text-muted-foreground uppercase text-[11px] font-bold">
              <tr>
                <th className="px-4 py-3">Job ID</th>
                <th className="px-4 py-3">Job Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Correlation ID</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-card/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground font-semibold">{job.id}</td>
                  <td className="px-4 py-3 text-xs font-medium text-foreground">{job.jobType}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        job.status === "SUCCEEDED"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : job.status === "RUNNING"
                          ? "bg-amber-500/10 text-amber-500 animate-pulse"
                          : job.status === "FAILED"
                          ? "bg-rose-500/10 text-rose-500"
                          : "bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      {job.status === "SUCCEEDED" && <CheckCircle className="w-3 h-3" />}
                      {job.status === "RUNNING" && <Clock className="w-3 h-3" />}
                      {job.status === "FAILED" && <AlertTriangle className="w-3 h-3" />}
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">P{job.priority}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{job.attempts}/{job.maxAttempts}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{job.correlationId || "—"}</td>
                  <td className="px-4 py-3 text-xs space-x-2">
                    {job.status === "FAILED" && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        className="px-2.5 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30 font-semibold"
                      >
                        <RotateCcw className="w-3 h-3 inline mr-1" /> Retry
                      </button>
                    )}
                    {job.status === "RUNNING" && (
                      <button
                        onClick={() => handleCancel(job.id)}
                        className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 font-semibold"
                      >
                        <XCircle className="w-3 h-3 inline mr-1" /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No background jobs match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
