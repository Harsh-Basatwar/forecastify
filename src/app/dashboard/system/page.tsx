"use client";

import Link from "next/link";
import {
  Workflow,
  PlayCircle,
  Clock,
  Cpu,
  HeartPulse,
  Network,
  GitCommit,
  Activity,
  ShieldAlert,
  Gauge,
  Sliders,
  Lock,
  Database,
  Layers,
  Zap,
  FileText,
  Target,
  ClipboardList,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const domains = [
  {
    title: "Workflows & Automation",
    description: "Background processing pipelines, scheduled tasks, and worker pools.",
    badge: "4 Tools",
    tools: [
      { href: "/dashboard/system/workflows", label: "Workflows", desc: "Pipeline orchestration", icon: Workflow },
      { href: "/dashboard/system/jobs", label: "Jobs", desc: "Task execution queue", icon: PlayCircle },
      { href: "/dashboard/system/scheduler", label: "Scheduler", desc: "Cron & recurring triggers", icon: Clock },
      { href: "/dashboard/system/workers", label: "Workers", desc: "Active worker nodes", icon: Cpu },
    ],
  },
  {
    title: "Infrastructure & Health",
    description: "Subsystem health monitors, topology graphs, and capacity management.",
    badge: "4 Tools",
    tools: [
      { href: "/dashboard/system/health", label: "System Health", desc: "Services uptime status", icon: HeartPulse },
      { href: "/dashboard/system/service-graph", label: "Service Graph", desc: "API dependency map", icon: Network },
      { href: "/dashboard/system/capacity", label: "Capacity", desc: "Storage & resource usage", icon: Layers },
      { href: "/dashboard/system/backup-recovery", label: "Backup & Recovery", desc: "Snapshots & restore", icon: Database },
    ],
  },
  {
    title: "Observability & Telemetry",
    description: "Distributed tracing, AI model drift analysis, and SLA performance profiling.",
    badge: "5 Tools",
    tools: [
      { href: "/dashboard/system/traces", label: "Traces", desc: "Distributed tracing", icon: GitCommit },
      { href: "/dashboard/system/drift", label: "Model Drift", desc: "Forecast drift tracking", icon: Activity },
      { href: "/dashboard/system/sla", label: "SLA Monitor", desc: "Latency & uptime targets", icon: Gauge },
      { href: "/dashboard/system/profiler", label: "Profiler", desc: "CPU & memory profiling", icon: Zap },
      { href: "/dashboard/system/metrics", label: "Metrics", desc: "High-resolution telemetry", icon: Target },
    ],
  },
  {
    title: "Governance & Security",
    description: "Platform configuration, distributed locking, system alerts, and audit logging.",
    badge: "5 Tools",
    tools: [
      { href: "/dashboard/system/configuration", label: "Configuration", desc: "Global system parameters", icon: Sliders },
      { href: "/dashboard/system/locks", label: "System Locks", desc: "Distributed lock status", icon: Lock },
      { href: "/dashboard/system/alerts", label: "System Alerts", desc: "Platform operational alerts", icon: ShieldAlert },
      { href: "/dashboard/system/reports", label: "Reports", desc: "Exportable summaries", icon: FileText },
      { href: "/dashboard/system/audit", label: "Audit Logs", desc: "Security access log", icon: ClipboardList },
    ],
  },
];

export default function SystemConsolePage() {
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <span className="text-xs font-mono uppercase text-accent font-semibold tracking-wider px-2 py-0.5 rounded bg-accent/10">Platform Admin</span>
          </div>
          <h1 className="fx-display text-[26px] text-foreground">Platform Operations Console</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Centralized hub for system telemetry, background workers, infrastructure diagnostics, and governance.
          </p>
        </div>
      </div>

      {/* Grid of Domain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {domains.map((domain) => (
          <div
            key={domain.title}
            className="fx-card p-6 flex flex-col justify-between space-y-5 border border-border/80 hover:border-border transition-colors"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="fx-display text-[18px] text-foreground font-semibold">{domain.title}</h2>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                  {domain.badge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{domain.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {domain.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className="group flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-card hover:bg-hover-surface hover:border-accent/30 transition-all fx-press"
                    >
                      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-accent group-hover:bg-accent/10 transition-colors shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-accent transition-colors flex items-center justify-between">
                          <span>{tool.label}</span>
                          <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tool.desc}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
