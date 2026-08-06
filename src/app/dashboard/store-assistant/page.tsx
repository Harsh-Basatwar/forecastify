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
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header & Autonomous Hero Control Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fx-card p-6 md:p-8 bg-gradient-to-br from-card via-card to-accent/10 border border-accent/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cpu className="w-48 h-48 text-accent" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/30">
                <Sunrise className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">Autonomous Store Operating System</h1>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent/20 text-accent border border-accent/30">
                    SUITE 2.0
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Designed specifically to remove operational work from the shop owner.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Voice Control Button */}
            <button
              onClick={toggleVoice}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border",
                isListening
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                  : "bg-card hover:bg-accent/10 border-border text-foreground"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-accent" />}
              {isListening ? "Listening..." : "Hands-Free Voice"}
            </button>

            {/* Manual Cycle Trigger */}
            <button
              onClick={handleRunCycle}
              disabled={runningCycle}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-card hover:bg-accent/10 border border-border text-foreground transition-all disabled:opacity-50"
            >
              <RotateCw className={cn("w-4 h-4 text-accent", runningCycle && "animate-spin")} />
              {runningCycle ? "Running..." : "Run Auto-Cycle"}
            </button>

            {/* Autonomous Mode Toggle Button */}
            <button
              onClick={toggleAutonomous}
              className={cn(
                "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md",
                autonomousSummary?.isEnabled
                  ? "bg-accent text-accent-foreground hover:opacity-90 shadow-accent/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
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
            className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/30 text-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>
                Voice Command Recognized: <strong>&quot;{voiceResult.transcript}&quot;</strong> (Intent: {voiceResult.intent})
              </span>
            </div>
            <button onClick={() => setVoiceResult(null)} className="text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Key KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/50">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Store Health Score</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold">{healthScore !== null ? `${healthScore}/100` : "Loading..."}</span>
              <HeartPulse className="w-4 h-4 text-accent" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Auto-Approved Today</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-emerald-400">{autonomousSummary?.autoApprovedToday || 0} actions</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Pending Your Approval</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-amber-400">{pendingActions.length} pending</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Est. Time Saved Today</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-teal-400">{autonomousSummary?.savingsEstimate || 0} mins</span>
              <Zap className="w-4 h-4 text-teal-400" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pending Autonomous Actions Approval Queue (Flagship Feature) */}
      {pendingActions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold tracking-tight">Autonomous Action Approval Queue</h2>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {pendingActions.length} Pending
              </span>
            </div>
            <Link
              href="/dashboard/store-assistant/autonomous"
              className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
            >
              Open Control Panel <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingActions.slice(0, 4).map((action) => (
              <div
                key={action.id}
                className="fx-card p-4 flex flex-col justify-between space-y-3 border-l-4 border-l-amber-500 hover:border-amber-400 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {action.action_type.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(action.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold mt-1">{action.action_title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{action.action_description}</p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <button
                    onClick={() => handleApproveAction(action.id)}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectAction(action.id)}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all"
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
              <div>
                <h2 className="text-lg font-bold tracking-tight">{group.label}</h2>
                <p className="text-xs text-muted-foreground">{group.desc}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((item) => {
                  const IconComp = ICON_MAP[item.icon] || Sunrise;
                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        whileHover={{ y: -2 }}
                        className="fx-card p-5 h-full flex flex-col justify-between group hover:border-accent/50 transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="p-2.5 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-all">
                              <IconComp className="w-5 h-5" />
                            </div>
                            {item.badge && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-accent/15 text-accent border border-accent/30">
                                {item.badge}
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-sm font-bold group-hover:text-accent transition-colors flex items-center gap-1.5">
                              {item.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] font-semibold text-accent">
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
