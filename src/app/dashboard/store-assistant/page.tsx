/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sunrise,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Mic,
  MicOff,
  Sparkles,
  Zap,
  TrendingUp,
  MessageSquare,
  PartyPopper,
  ShoppingCart,
  BookOpen,
  ListChecks,
  LayoutGrid,
  Timer,
  PackageX,
  ClipboardCheck,
  Brain,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  ShieldAlert,
  Wallet,
  BarChart3,
  Send,
  FileSpreadsheet,
  Heart,
  Users,
  Truck,
  Target,
  Receipt,
  Handshake,
  Shield,
  Activity,
  Play,
  RotateCw,
} from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";
import { STORE_ASSISTANT_NAV } from "@/lib/store-assistant/constants";
import { voiceService, VoiceCommand } from "@/lib/store-assistant/voice-service";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, any> = {
  Sunrise,
  ShoppingCart,
  BookOpen,
  ListChecks,
  LayoutGrid,
  Timer,
  PackageX,
  ClipboardCheck,
  Brain,
  TrendingUp,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  ShieldAlert,
  Wallet,
  BarChart3,
  MessageSquare,
  Send,
  FileSpreadsheet,
  Heart,
  Users,
  Truck,
  PartyPopper,
  Target,
  Receipt,
  Handshake,
  Cpu,
};

export default function StoreAssistantHubPage() {
  const { callApi } = useStoreAssistant();
  const [autonomousSummary, setAutonomousSummary] = useState<any>(null);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceCommand | null>(null);
  const [runningCycle, setRunningCycle] = useState(false);

  const fetchHubData = async () => {
    const summary = await callApi("autonomous.summary");
    if (summary) setAutonomousSummary(summary);

    const pending = await callApi("autonomous.pending");
    if (pending) setPendingActions(pending);

    const health = await callApi("health.compute");
    if (health) setHealthScore(health.overall_score);
  };

  useEffect(() => {
    fetchHubData();
  }, []);

  const toggleAutonomous = async () => {
    if (!autonomousSummary) return;
    const action = autonomousSummary.isEnabled ? "autonomous.disable" : "autonomous.enable";
    await callApi(action);
    fetchHubData();
  };

  const handleRunCycle = async () => {
    setRunningCycle(true);
    await callApi("autonomous.runCycle");
    await fetchHubData();
    setRunningCycle(false);
  };

  const handleApproveAction = async (actionId: string) => {
    await callApi("autonomous.approve", { actionId });
    fetchHubData();
  };

  const handleRejectAction = async (actionId: string) => {
    await callApi("autonomous.reject", { actionId });
    fetchHubData();
  };

  const toggleVoice = () => {
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    } else {
      voiceService.startListening(
        (cmd) => {
          setVoiceResult(cmd);
          setIsListening(false);
        },
        (err) => {
          console.error("Voice error:", err);
          setIsListening(false);
        }
      );
      setIsListening(true);
    }
  };

  const groups = [
    { key: "core", label: "Core Store Operations", desc: "Daily workflows that save 4+ hours of manual labor every single day" },
    { key: "intelligence", label: "Intelligence & Optimization", desc: "AI-driven decision engines working continuously behind the scenes" },
    { key: "communication", label: "Communication & Compliance", desc: "Automated vendor/customer comms & zero-friction tax compliance" },
    { key: "strategy", label: "Strategy & Growth", desc: "Long-term goal setting, festival prep, and store expansion insights" },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Header & Autonomous Hero Control Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fx-card p-6 md:p-8 bg-card border border-border relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Cpu className="w-56 h-56 text-accent" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <Sunrise className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="fx-display text-[24px] sm:text-[26px] text-foreground font-semibold tracking-tight">Autonomous Store Operating System</h1>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                    SUITE 2.0
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Autonomous decision engine designed to run inventory, reordering, and compliance workflows hands-free.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Voice Control Button */}
            <button
              type="button"
              onClick={toggleVoice}
              className={cn(
                "fx-btn fx-press text-xs gap-2",
                isListening
                  ? "bg-danger-soft text-danger border-danger/30 animate-pulse"
                  : "bg-secondary text-secondary-foreground hover:bg-hover-surface"
              )}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5 text-danger" /> : <Mic className="w-3.5 h-3.5 text-accent" />}
              <span>{isListening ? "Listening..." : "Voice Control"}</span>
            </button>

            {/* Manual Cycle Trigger */}
            <button
              type="button"
              onClick={handleRunCycle}
              disabled={runningCycle}
              className="fx-btn fx-press text-xs gap-2 bg-secondary text-secondary-foreground hover:bg-hover-surface disabled:opacity-50"
            >
              <RotateCw className={cn("w-3.5 h-3.5 text-accent", runningCycle && "animate-spin")} />
              <span>{runningCycle ? "Running..." : "Run Auto-Cycle"}</span>
            </button>

            {/* Autonomous Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleAutonomous}
              className={cn(
                "fx-btn text-xs font-bold gap-2 fx-press",
                autonomousSummary?.isEnabled
                  ? "fx-btn-accent"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground"
              )}
            >
              <Cpu className="w-4 h-4" />
              <span>AUTONOMOUS MODE: {autonomousSummary?.isEnabled ? "ACTIVE" : "OFF"}</span>
            </button>
          </div>
        </div>

        {/* Voice Recognition Feedback Notification */}
        {voiceResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/25 text-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
              <span className="text-foreground">
                Voice Command Recognized: <strong>&quot;{voiceResult.transcript}&quot;</strong> (Intent: {voiceResult.intent})
              </span>
            </div>
            <button type="button" onClick={() => setVoiceResult(null)} className="text-muted-foreground hover:text-foreground text-xs">
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Key KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/80">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Store Health Score</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-foreground">{healthScore !== null ? `${healthScore}/100` : "Loading..."}</span>
              <HeartPulse className="w-4 h-4 text-accent" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Auto-Approved Today</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-success">{autonomousSummary?.autoApprovedToday || 0}</span>
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Pending Approval</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-warning">{pendingActions.length}</span>
              <AlertCircle className="w-4 h-4 text-warning" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Est. Time Saved Today</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-accent">{autonomousSummary?.savingsEstimate || 0} mins</span>
              <Zap className="w-4 h-4 text-accent" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pending Autonomous Actions Approval Queue */}
      {pendingActions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-warning" />
              <h2 className="fx-display text-[18px] text-foreground font-semibold">Autonomous Action Approval Queue</h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-warning-soft text-warning border border-warning/30">
                {pendingActions.length} Pending
              </span>
            </div>
            <Link
              href="/dashboard/store-assistant/autonomous"
              className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 fx-press"
            >
              <span>Open Control Panel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingActions.slice(0, 4).map((action) => (
              <div
                key={action.id}
                className="fx-card p-5 flex flex-col justify-between space-y-3 border-l-4 border-l-warning hover:border-border transition-all bg-card"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-warning">
                      {action.action_type.replace("_", " ")}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {new Date(action.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mt-1.5">{action.action_title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{action.action_description}</p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => handleApproveAction(action.id)}
                    className="flex-1 fx-btn text-xs font-semibold bg-success-soft text-success border-success/30 hover:bg-success/20 fx-press"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectAction(action.id)}
                    className="flex-1 fx-btn text-xs font-semibold bg-danger-soft text-danger border-danger/30 hover:bg-danger/20 fx-press"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Grouped Module Cards */}
      <div className="space-y-8">
        {groups.map((group) => {
          const items = STORE_ASSISTANT_NAV.filter((item) => item.group === group.key);
          return (
            <div key={group.key} className="space-y-4">
              <div className="border-b border-border pb-3">
                <h2 className="fx-display text-[18px] text-foreground font-semibold">{group.label}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{group.desc}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((item) => {
                  const IconComp = ICON_MAP[item.icon] || Sunrise;
                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        whileHover={{ y: -2 }}
                        className="fx-card p-5 h-full flex flex-col justify-between group hover:border-accent/40 transition-all cursor-pointer bg-card border border-border"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                              <IconComp className="w-4.5 h-4.5" />
                            </div>
                            {item.badge && (
                              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded bg-accent/10 text-accent border border-accent/20">
                                {item.badge}
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors flex items-center gap-1.5">
                              {item.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold text-accent">
                          <span>Open Module</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
