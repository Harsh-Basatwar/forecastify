/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Cpu,
  CheckCircle2,
  XCircle,
  Clock,
  Sliders,
  Shield,
  Zap,
  ArrowLeft,
  RotateCw,
  AlertTriangle,
  Play,
  Pause,
} from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";
import { cn } from "@/lib/utils";

export default function AutonomousControlPanelPage() {
  const { callApi } = useStoreAssistant();
  const [config, setConfig] = useState<any>(null);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [historyActions, setHistoryActions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const loadData = async () => {
    const cfg = await callApi("autonomous.config");
    if (cfg) setConfig(cfg);

    const pending = await callApi("autonomous.pending");
    if (pending) setPendingActions(pending);

    const history = await callApi("autonomous.actions", { limit: 20 });
    if (history) setHistoryActions(history);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleOption = async (key: string, value: boolean) => {
    if (!config) return;
    const updated = { ...config, [key]: value };
    setConfig(updated);
    setSaving(true);
    await callApi("autonomous.updateConfig", { [key]: value });
    setSaving(false);
  };

  const handleUpdateLimit = async (key: string, value: number) => {
    if (!config) return;
    const updated = { ...config, [key]: value };
    setConfig(updated);
    setSaving(true);
    await callApi("autonomous.updateConfig", { [key]: value });
    setSaving(false);
  };

  const handleRunCycle = async () => {
    setRunning(true);
    await callApi("autonomous.runCycle");
    await loadData();
    setRunning(false);
  };

  const handleApprove = async (actionId: string) => {
    await callApi("autonomous.approve", { actionId });
    loadData();
  };

  const handleReject = async (actionId: string) => {
    await callApi("autonomous.reject", { actionId });
    loadData();
  };

  const handleApproveAll = async () => {
    for (const act of pendingActions) {
      await callApi("autonomous.approve", { actionId: act.id });
    }
    loadData();
  };

  const configToggles = [
    { key: "auto_purchase_orders", label: "Auto Purchase Orders", desc: "Auto-generate purchase orders when stock reaches reorder point" },
    { key: "auto_stockout_orders", label: "Auto Stockout Emergency Orders", desc: "Instantly draft POs for out-of-stock items" },
    { key: "auto_supplier_comms", label: "Auto Supplier Follow-ups", desc: "Send WhatsApp/email reminders to unresponsive vendors" },
    { key: "auto_employee_tasks", label: "Auto Task Assignment", desc: "Assign shelf refills, expiry checks, and cleaning tasks daily" },
    { key: "auto_morning_brief", label: "Auto Morning Brief", desc: "Generate morning operational priority report at 7:00 AM" },
    { key: "auto_closing_report", label: "Auto Closing Report", desc: "Generate cash & sales reconciliation report at closing" },
    { key: "auto_expiry_actions", label: "Auto Expiry Actions", desc: "Automatically discount near-expiry items" },
    { key: "auto_khata_reminders", label: "Auto Khata Reminders", desc: "Send WhatsApp payment reminders for overdue credit" },
    { key: "auto_pricing", label: "Auto Dynamic Pricing", desc: "Apply demand & margin-based price optimizations" },
    { key: "auto_health_alerts", label: "Auto Health Monitoring", desc: "Alert on operational health drops across 9 dimensions" },
    { key: "auto_compliance_prep", label: "Auto GST Filing Prep", desc: "Compute GST liability and flag missing invoices" },
  ];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/store-assistant"
            className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Cpu className="w-6 h-6 text-accent" /> Autonomous Mode Control Panel
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure parameters, threshold limits, quiet hours, and approve pending autopilot store actions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunCycle}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-accent/10 border border-border text-foreground transition-all disabled:opacity-50"
          >
            <RotateCw className={cn("w-4 h-4 text-accent", running && "animate-spin")} />
            {running ? "Executing Cycle..." : "Run Manual Cycle"}
          </button>

          <button
            onClick={async () => {
              const action = config?.is_enabled ? "autonomous.disable" : "autonomous.enable";
              await callApi(action);
              loadData();
            }}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md",
              config?.is_enabled
                ? "bg-accent text-accent-foreground hover:opacity-90 shadow-accent/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {config?.is_enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {config?.is_enabled ? "PAUSE AUTONOMOUS MODE" : "ENABLE AUTONOMOUS MODE"}
          </button>
        </div>
      </div>

      {/* Main Grid: Settings & Pending Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Automation Settings & Thresholds */}
        <div className="lg:col-span-2 space-y-6">
          {/* Autopilot Safety Thresholds */}
          <div className="fx-card p-6 space-y-4 border-l-4 border-l-accent">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-accent" />
              <h2 className="text-base font-bold">Autopilot Guardrails & Threshold Limits</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Actions within these limits are auto-approved; actions exceeding limits require your explicit click.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5 p-3 rounded-xl bg-card/60 border border-border/50">
                <label className="text-xs font-semibold text-muted-foreground">
                  PO Auto-Approve Amount Limit (₹)
                </label>
                <input
                  type="number"
                  value={config?.po_auto_approve_limit || 10000}
                  onChange={(e) => handleUpdateLimit("po_auto_approve_limit", Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-bold text-accent"
                />
                <span className="text-[10px] text-muted-foreground">POs below this amount do not block for review</span>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-card/60 border border-border/50">
                <label className="text-xs font-semibold text-muted-foreground">
                  Max Auto Price Change (%)
                </label>
                <input
                  type="number"
                  value={config?.price_change_max_pct || 15}
                  onChange={(e) => handleUpdateLimit("price_change_max_pct", Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-bold text-accent"
                />
                <span className="text-[10px] text-muted-foreground">Price changes larger than this require review</span>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-card/60 border border-border/50">
                <label className="text-xs font-semibold text-muted-foreground">
                  Expiry Discount Lead Days
                </label>
                <input
                  type="number"
                  value={config?.expiry_auto_discount_days || 3}
                  onChange={(e) => handleUpdateLimit("expiry_auto_discount_days", Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-bold text-accent"
                />
                <span className="text-[10px] text-muted-foreground">Auto-discount items expiring within this many days</span>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-card/60 border border-border/50">
                <label className="text-xs font-semibold text-muted-foreground">
                  Quiet Hours (No Notifications)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={config?.quiet_hours_start || "22:00"}
                    onChange={(e) => handleUpdateLimit("quiet_hours_start", e.target.value as any)}
                    className="w-1/2 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-center font-bold text-accent"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <input
                    type="text"
                    value={config?.quiet_hours_end || "07:00"}
                    onChange={(e) => handleUpdateLimit("quiet_hours_end", e.target.value as any)}
                    className="w-1/2 bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-center font-bold text-accent"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">Autopilot stays silent during night hours</span>
              </div>
            </div>
          </div>

          {/* Module Capabilities Toggles */}
          <div className="fx-card p-6 space-y-4">
            <h2 className="text-base font-bold">Autonomous Capability Toggles</h2>
            <div className="space-y-3">
              {configToggles.map((item) => {
                const isActive = !!config?.[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex items-start justify-between p-3.5 rounded-xl bg-card/50 hover:bg-card border border-border/50 transition-all gap-4"
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold">{item.label}</span>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>

                    <button
                      onClick={() => handleToggleOption(item.key, !isActive)}
                      className={cn(
                        "w-11 h-6 rounded-full transition-colors relative flex-shrink-0 mt-0.5 p-0.5",
                        isActive ? "bg-accent" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full bg-white transition-transform block shadow-sm",
                          isActive ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Approval Queue & History */}
        <div className="space-y-6">
          {/* Pending Action Approval Queue */}
          <div className="fx-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">Pending Review Queue</h2>
              </div>
              {pendingActions.length > 1 && (
                <button
                  onClick={handleApproveAll}
                  className="text-xs font-bold text-emerald-400 hover:underline"
                >
                  Approve All ({pendingActions.length})
                </button>
              )}
            </div>

            {pendingActions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400/60" />
                <p className="text-xs">All autonomous store actions reviewed & cleared!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {pendingActions.map((act) => (
                  <div key={act.id} className="p-3.5 rounded-xl bg-card border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-400 uppercase">{act.action_type.replace("_", " ")}</span>
                      <span className="text-muted-foreground">
                        {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold">{act.action_title}</h3>
                    <p className="text-[11px] text-muted-foreground">{act.action_description}</p>
                    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                      <button
                        onClick={() => handleApprove(act.id)}
                        className="flex-1 py-1 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(act.id)}
                        className="flex-1 py-1 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Log History */}
          <div className="fx-card p-6 space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> Execution Audit History
            </h2>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {historyActions.map((act) => (
                <div key={act.id} className="p-2.5 rounded-lg bg-card/40 border border-border/40 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{act.action_title}</span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 text-[9px] font-bold rounded uppercase",
                        act.approval_status === "auto_approved" && "bg-emerald-500/20 text-emerald-400",
                        act.approval_status === "approved" && "bg-blue-500/20 text-blue-400",
                        act.approval_status === "rejected" && "bg-rose-500/20 text-rose-400",
                        act.approval_status === "pending" && "bg-amber-500/20 text-amber-400"
                      )}
                    >
                      {act.approval_status}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[10px] truncate">{act.action_description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
