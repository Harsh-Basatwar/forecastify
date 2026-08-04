"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  FlaskConical, Zap, TrendingUp, TrendingDown, Package, AlertTriangle,
  ShieldCheck, Clock, DollarSign, Loader2,
  Sun, CloudRain, PartyPopper, Percent, Truck, ShoppingCart,
  ArrowRight, ChevronDown, ChevronUp, Target, Lightbulb,
  Minus, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SimResult {
  scenarioTitle: string;
  summary: string;
  overallImpact: "positive" | "negative" | "mixed";
  revenueChange: { before: number; after: number; changePercent: number };
  demandChange: { before: number; after: number; changePercent: number };
  riskLevel: string;
  confidence: number;
  affectedProducts: any[];
  timeline: any[];
  recommendations: string[];
  risks: string[];
  opportunities: string[];
}

const SCENARIO_TEMPLATES = [
  { id: "festival", icon: PartyPopper, label: "Festival / Holiday", placeholder: "e.g. Diwali is in 5 days, how will demand change?", example: "Diwali festival starts in 5 days. How will it affect my store?" },
  { id: "price", icon: Percent, label: "Price Change", placeholder: "e.g. I increase milk price by 10%", example: "What if I increase prices of all dairy products by 15%?" },
  { id: "weather", icon: Sun, label: "Weather Change", placeholder: "e.g. Heavy rain for next 3 days", example: "What if there is heavy rainfall for the next 5 days?" },
  { id: "supply", icon: Truck, label: "Supply Disruption", placeholder: "e.g. Supplier delays delivery by 4 days", example: "What if my main supplier delays delivery by 1 week?" },
  { id: "promo", icon: ShoppingCart, label: "Run a Promotion", placeholder: "e.g. Buy 1 Get 1 on snacks", example: "What if I run a Buy 2 Get 1 Free offer on all snacks for 3 days?" },
  { id: "competitor", icon: Target, label: "Competitor Action", placeholder: "e.g. New store opens nearby", example: "What if a competitor opens a new store 500 meters away?" },
  { id: "heatwave", icon: CloudRain, label: "Extreme Weather", placeholder: "e.g. Temperature hits 45°C", example: "What if temperature goes above 45°C for the next week?" },
  { id: "custom", icon: FlaskConical, label: "Custom Scenario", placeholder: "Describe any scenario...", example: "" },
];

export default function WhatIfPage() {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [scenario, setScenario] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [dataPoints, setDataPoints] = useState(0);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (result) {
      setAnimateIn(false);
      requestAnimationFrame(() => setAnimateIn(true));
    }
  }, [result]);

  const runSimulation = async () => {
    if (!scenario.trim() || !user) return;
    setLoading(true);
    setResult(null);
    setExpandedProduct(null);
    setShowTimeline(false);
    try {
      const res = await fetch("/api/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, scenario: scenario.trim() }),
      });
      const data = await res.json();
      if (data.simulation && !data.simulation.error) {
        setResult(data.simulation);
        setDataPoints(data.dataPoints || 0);
      }
    } catch {} finally { setLoading(false); }
  };

  const selectTemplate = (t: typeof SCENARIO_TEMPLATES[0]) => {
    setSelectedTemplate(t.id);
    if (t.example) setScenario(t.example);
    else setScenario("");
  };

  const impactColor = (impact: string) =>
    impact === "positive" ? "text-success" : impact === "negative" ? "text-danger" : "text-warning";
  const impactSignal = (impact: string) =>
    impact === "positive" ? "fx-signal-success" : impact === "negative" ? "fx-signal-danger" : "fx-signal-warning";
  const riskBadge = (risk: string) =>
    risk === "critical" || risk === "high" ? "fx-badge-danger" : risk === "medium" ? "fx-badge-warning" : "fx-badge-success";
  const stockoutBadge = (risk: string) =>
    risk === "high" ? "fx-badge-danger" : risk === "medium" || risk === "low" ? "fx-badge-warning" : "fx-badge-success";

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Page lead — editorial, no card */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="min-w-0">
          <h1 className="fx-display text-[24px] text-foreground">What-If Simulator</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5 max-w-xl">
            Simulate real scenarios and see how they impact your store. Powered by your actual sales history and inventory data.
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} />
            <span><span className="font-medium text-secondary-foreground">How to use:</span> pick a scenario type below, customize the details, and hit Simulate. The engine uses your real 30-day sales history to calculate impact on each product — no guesswork.</span>
          </p>
        </div>
        {dataPoints > 0 && (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
            <span className="fx-signal fx-signal-success" aria-hidden="true" />
            <span className="fx-num">{dataPoints}</span> data points analyzed
          </span>
        )}
      </div>

      {/* Scenario Templates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="group" aria-label="Scenario templates">
        {SCENARIO_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTemplate(t)}
            aria-pressed={selectedTemplate === t.id}
            className={`fx-card fx-card-interactive flex flex-col items-center gap-2 p-4 text-center fx-focus cursor-pointer ${
              selectedTemplate === t.id
                ? "!border-[var(--accent-border)] !bg-[var(--accent-soft)]"
                : ""
            }`}
          >
            <t.icon
              className={`w-4 h-4 ${selectedTemplate === t.id ? "text-accent" : "text-muted-foreground"}`}
              aria-hidden="true"
              strokeWidth={1.8}
            />
            <span className={`text-xs font-medium ${selectedTemplate === t.id ? "text-accent font-semibold" : "text-foreground"}`}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      <section aria-label="Scenario input" className="fx-card p-6">
        <label htmlFor="scenario-input" className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Describe Your Scenario
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <textarea
            id="scenario-input"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runSimulation(); } }}
            placeholder={SCENARIO_TEMPLATES.find((t) => t.id === selectedTemplate)?.placeholder || "Describe a scenario to simulate..."}
            rows={3}
            className="fx-input flex-1 resize-none"
          />
          <button
            onClick={runSimulation}
            disabled={loading || !scenario.trim()}
            className="fx-btn fx-btn-accent self-end"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <FlaskConical className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />}
            {loading ? "Simulating..." : "Simulate"}
          </button>
        </div>
      </section>

      {/* Loading — skeleton mirrors the result layout */}
      {loading && (
        <div className="space-y-6" aria-busy="true" aria-label="Running simulation">
          <div className="fx-card p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-secondary-foreground font-medium">
              <span className="w-4 h-4 border-2 border-border-strong border-t-accent rounded-full animate-spin" aria-hidden="true" />
              Running simulation…
            </div>
            <p className="text-xs text-muted-foreground">Analyzing {dataPoints || "your"} historic sales records against this scenario</p>
            <div className="skeleton-shimmer h-5 w-64" />
            <div className="skeleton-shimmer h-3.5 w-full" />
            <div className="skeleton-shimmer h-3.5 w-2/3" />
          </div>
          <div className="fx-card grid grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-5 space-y-2.5 border-r border-border last:border-r-0">
                <div className="skeleton-shimmer h-3 w-20" />
                <div className="skeleton-shimmer h-7 w-24" />
                <div className="skeleton-shimmer h-3 w-16" />
              </div>
            ))}
          </div>
          <div className="fx-card p-6 space-y-3">
            <div className="skeleton-shimmer h-4 w-48" />
            {[0, 1, 2].map((i) => <div key={i} className="skeleton-shimmer h-12 w-full" />)}
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className={`space-y-6 transition-all duration-500 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

          {/* Impact summary */}
          <section aria-label="Impact summary" className="fx-card p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                  <span className={`fx-signal ${impactSignal(result.overallImpact)}`} aria-hidden="true" />
                  <h3 className={`text-sm font-semibold ${impactColor(result.overallImpact)}`}>
                    {result.overallImpact === "positive" ? "Positive Impact" : result.overallImpact === "negative" ? "Negative Impact" : "Mixed Impact"}
                  </h3>
                  <span className={`fx-badge ${riskBadge(result.riskLevel)}`}>
                    {result.riskLevel?.toUpperCase()} RISK
                  </span>
                </div>
                <h4 className="fx-display text-[19px] text-foreground mb-1.5">{result.scenarioTitle}</h4>
                <p className="text-sm text-secondary-foreground leading-relaxed">{result.summary}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="fx-eyebrow">Confidence</p>
                <p className={`fx-num text-[30px] font-semibold leading-none mt-1.5 ${result.confidence >= 75 ? "text-success" : result.confidence >= 50 ? "text-warning" : "text-danger"}`}>{result.confidence}%</p>
              </div>
            </div>
          </section>

          {/* Key Metrics — one ledger sheet */}
          <section aria-label="Key metrics" className="fx-card grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--border)] overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="fx-eyebrow">Revenue / Day</p>
                <DollarSign className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <p className="fx-num text-xl font-semibold text-foreground mt-2">₹{(result.revenueChange?.after || 0).toLocaleString("en-IN")}</p>
              <p className="flex items-center gap-1 mt-1.5 text-xs">
                {result.revenueChange?.changePercent >= 0
                  ? <ArrowUpRight className="w-3.5 h-3.5 text-success" aria-hidden="true" strokeWidth={1.8} />
                  : <ArrowDownRight className="w-3.5 h-3.5 text-danger" aria-hidden="true" strokeWidth={1.8} />}
                <span className={`fx-num font-semibold ${result.revenueChange?.changePercent >= 0 ? "text-success" : "text-danger"}`}>
                  {result.revenueChange?.changePercent >= 0 ? "+" : ""}{result.revenueChange?.changePercent || 0}%
                </span>
                <span className="text-muted-foreground ml-1">from ₹{(result.revenueChange?.before || 0).toLocaleString("en-IN")}</span>
              </p>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="fx-eyebrow">Demand / Day</p>
                <TrendingUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <p className="fx-num text-xl font-semibold text-foreground mt-2">{result.demandChange?.after || 0} units</p>
              <p className="flex items-center gap-1 mt-1.5 text-xs">
                {result.demandChange?.changePercent >= 0
                  ? <ArrowUpRight className="w-3.5 h-3.5 text-success" aria-hidden="true" strokeWidth={1.8} />
                  : <ArrowDownRight className="w-3.5 h-3.5 text-danger" aria-hidden="true" strokeWidth={1.8} />}
                <span className={`fx-num font-semibold ${result.demandChange?.changePercent >= 0 ? "text-success" : "text-danger"}`}>
                  {result.demandChange?.changePercent >= 0 ? "+" : ""}{result.demandChange?.changePercent || 0}%
                </span>
                <span className="text-muted-foreground ml-1">from {result.demandChange?.before || 0}</span>
              </p>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="fx-eyebrow">Products Affected</p>
                <Package className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <p className="fx-num text-xl font-semibold text-foreground mt-2">{result.affectedProducts?.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {result.affectedProducts?.filter((p: any) => p.stockoutRisk === "high").length || 0} at stockout risk
              </p>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="fx-eyebrow">Risk Level</p>
                <ShieldCheck className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <p className="flex items-center gap-2 mt-2">
                <span className={`fx-signal ${result.riskLevel === "critical" || result.riskLevel === "high" ? "fx-signal-danger" : result.riskLevel === "medium" ? "fx-signal-warning" : "fx-signal-success"}`} aria-hidden="true" />
                <span className="text-xl font-semibold text-foreground capitalize">{result.riskLevel}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1.5"><span className="fx-num">{result.confidence}%</span> confidence</p>
            </div>
          </section>

          {/* Timeline */}
          {result.timeline?.length > 0 && (
            <section aria-label="Impact timeline" className="fx-card overflow-hidden">
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                aria-expanded={showTimeline}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/50 transition-colors fx-focus cursor-pointer"
              >
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} /> Impact Timeline ({result.timeline.length} days)
                </h3>
                {showTimeline ? <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
              </button>
              {showTimeline && (
                <div className="px-6 pb-5 fx-rule pt-1">
                  {result.timeline.map((t: any, i: number) => (
                    <div key={i} className="flex gap-4 py-3 border-b border-border last:border-b-0 items-start">
                      <span className="fx-num text-xs font-semibold text-secondary-foreground w-12 shrink-0 mt-0.5 inline-flex items-center gap-1.5">
                        <span
                          className={`fx-signal ${(t.demandMultiplier || 1) > 1.2 ? "fx-signal-success" : (t.demandMultiplier || 1) < 0.9 ? "fx-signal-danger" : "fx-signal-accent"}`}
                          aria-hidden="true"
                        />
                        {t.demandMultiplier ? `${t.demandMultiplier}x` : `D${i + 1}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">{t.day}</p>
                          {t.demandMultiplier && (
                            <span className={`fx-num text-xs font-semibold ${t.demandMultiplier > 1 ? "text-success" : "text-danger"}`}>
                              {t.demandMultiplier > 1 ? "+" : ""}{Math.round((t.demandMultiplier - 1) * 100)}% demand
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{t.event}</p>
                        {t.keyProducts?.length > 0 && (
                          <p className="text-xs text-secondary-foreground mt-1.5">
                            {t.keyProducts.join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Affected Products */}
          {result.affectedProducts?.length > 0 && (
            <section aria-label="Affected products" className="fx-card p-6">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} /> Affected Products Pipeline
              </h3>
              <div>
                {result.affectedProducts.map((p: any, i: number) => (
                  <div key={i} className="border-b border-border last:border-b-0">
                    <button
                      onClick={() => setExpandedProduct(expandedProduct === i ? null : i)}
                      aria-expanded={expandedProduct === i}
                      className="w-full flex items-center justify-between gap-3 py-3.5 px-1 hover:bg-secondary/40 transition-colors fx-focus cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {p.changePercent > 0
                          ? <TrendingUp className="w-4 h-4 text-success shrink-0" aria-hidden="true" strokeWidth={1.8} />
                          : p.changePercent < 0
                            ? <TrendingDown className="w-4 h-4 text-danger shrink-0" aria-hidden="true" strokeWidth={1.8} />
                            : <Minus className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" strokeWidth={1.8} />}
                        <div className="text-left min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:flex items-center gap-1.5 text-xs fx-num">
                          <span className="text-muted-foreground">{p.baselineDemand}/day</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                          <span className={`font-semibold ${p.changePercent > 0 ? "text-success" : p.changePercent < 0 ? "text-danger" : "text-foreground"}`}>
                            {p.projectedDemand}/day
                          </span>
                          <span className={`font-medium ${p.changePercent > 0 ? "text-success" : p.changePercent < 0 ? "text-danger" : "text-muted-foreground"}`}>
                            ({p.changePercent > 0 ? "+" : ""}{p.changePercent}%)
                          </span>
                        </span>
                        <span className={`fx-badge ${stockoutBadge(p.stockoutRisk)}`}>
                          {p.stockoutRisk === "none" ? "SAFE" : `${p.stockoutRisk?.toUpperCase()} RISK`}
                        </span>
                        {expandedProduct === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
                      </div>
                    </button>

                    {expandedProduct === i && (
                      <div className="px-1 pb-4 pt-1">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          <div>
                            <p className="fx-eyebrow text-[10px]">Current Stock</p>
                            <p className="fx-num text-sm font-semibold text-foreground mt-1">{p.currentStock} units</p>
                          </div>
                          <div>
                            <p className="fx-eyebrow text-[10px]">Baseline Demand</p>
                            <p className="fx-num text-sm font-semibold text-foreground mt-1">{p.baselineDemand}/day</p>
                          </div>
                          <div>
                            <p className="fx-eyebrow text-[10px]">Projected Demand</p>
                            <p className={`fx-num text-sm font-semibold mt-1 ${p.changePercent > 0 ? "text-success" : p.changePercent < 0 ? "text-danger" : "text-foreground"}`}>{p.projectedDemand}/day</p>
                          </div>
                          <div>
                            <p className="fx-eyebrow text-[10px]">Days of Stock</p>
                            <p className={`fx-num text-sm font-semibold mt-1 ${p.daysOfStock <= 2 ? "text-danger" : p.daysOfStock <= 5 ? "text-warning" : "text-success"}`}>{p.daysOfStock} days</p>
                          </div>
                        </div>
                        {/* Stock progress bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Stock coverage at projected demand</span>
                            <span className="fx-num">{p.daysOfStock} / 7 days</span>
                          </div>
                          <div
                            className="h-1 bg-muted rounded-full overflow-hidden"
                            role="progressbar"
                            aria-valuenow={Math.min(100, (p.daysOfStock / 7) * 100)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Stock coverage"
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (p.daysOfStock / 7) * 100)}%`,
                                background: p.daysOfStock <= 2 ? "var(--danger)" : p.daysOfStock <= 5 ? "var(--warning)" : "var(--accent)",
                              }}
                            />
                          </div>
                        </div>
                        <div className="fx-rule pt-3">
                          <p className="text-xs text-muted-foreground"><strong className="text-foreground font-semibold">Reasoning:</strong> {p.reasoning}</p>
                          <p className="text-xs mt-2"><strong className="font-semibold" style={{ color: "var(--accent)" }}>Action:</strong> <span className="text-foreground">{p.action}</span></p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommendations, Risks, Opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {result.recommendations?.length > 0 && (
              <section aria-label="Recommendations" className="fx-card p-5">
                <h4 className="fx-eyebrow flex items-center gap-1.5 mb-3">
                  <Zap className="w-3.5 h-3.5 text-accent" aria-hidden="true" strokeWidth={1.8} /> Recommendations
                </h4>
                <div>
                  {result.recommendations.map((r: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 py-2 border-b border-border last:border-b-0">
                      <span className="fx-signal fx-signal-accent mt-[5px]" aria-hidden="true" />
                      <p className="text-xs text-secondary-foreground leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result.risks?.length > 0 && (
              <section aria-label="Risks" className="fx-card p-5">
                <h4 className="fx-eyebrow flex items-center gap-1.5 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-danger" aria-hidden="true" strokeWidth={1.8} /> Risks
                </h4>
                <div>
                  {result.risks.map((r: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 py-2 border-b border-border last:border-b-0">
                      <span className="fx-signal fx-signal-danger mt-[5px]" aria-hidden="true" />
                      <p className="text-xs text-secondary-foreground leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result.opportunities?.length > 0 && (
              <section aria-label="Opportunities" className="fx-card p-5">
                <h4 className="fx-eyebrow flex items-center gap-1.5 mb-3">
                  <Lightbulb className="w-3.5 h-3.5 text-success" aria-hidden="true" strokeWidth={1.8} /> Opportunities
                </h4>
                <div>
                  {result.opportunities.map((r: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5 py-2 border-b border-border last:border-b-0">
                      <span className="fx-signal fx-signal-success mt-[5px]" aria-hidden="true" />
                      <p className="text-xs text-secondary-foreground leading-relaxed">{r}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="fx-card flex flex-col items-center justify-center text-center py-16 px-6">
          <FlaskConical className="w-5 h-5 text-muted-foreground mb-3 opacity-60" aria-hidden="true" strokeWidth={1.8} />
          <p className="text-sm text-secondary-foreground font-medium">Pick a scenario and hit Simulate</p>
          <p className="text-xs text-muted-foreground mt-1">Results are backed by your real sales data</p>
        </div>
      )}
    </div>
  );
}
