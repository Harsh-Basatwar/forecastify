"use client";

import { useEffect, useState } from "react";
import { FileText, RefreshCw, Download, Play } from "lucide-react";
import { OperationalReport } from "@/lib/background/reports";

export default function ReportsDashboardPage() {
  const [reports, setReports] = useState<OperationalReport[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/reports");
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  async function handleGenerate() {
    await fetch("/api/background/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportType: "DAILY" }),
    });
    fetchReports();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-7 h-7 text-accent" />
            Operational Intelligence Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated daily, weekly, and monthly enterprise operations summaries.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <Play className="w-4 h-4" /> Generate Ad-Hoc Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((rep) => (
          <div key={rep.id} className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-accent/10 text-accent">{rep.reportType}</span>
              <span className="text-xs text-muted-foreground">{new Date(rep.generatedAt).toLocaleString()}</span>
            </div>
            <h3 className="text-base font-bold text-foreground">{rep.title}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t border-border/40">
              <div>Jobs Executed: <strong className="text-foreground">{rep.summary.jobsExecuted}</strong></div>
              <div>Failed: <strong className="text-rose-500">{rep.summary.failedJobs}</strong></div>
              <div>Uptime: <strong className="text-emerald-500">{rep.summary.uptimePct}%</strong></div>
              <div>Avg Latency: <strong className="text-foreground">{rep.summary.avgLatencyMs} ms</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
