/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Clock,
  AlertTriangle,
  Trash2,
  DollarSign,
  Calendar,
  TrendingDown,
  Percent,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  chartColor, tooltipStyle, tooltipLabelStyle, gridProps, axisProps, CHART_H,
} from "@/lib/chart-theme";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface RiskProduct {
  productName: string;
  category: string;
  quantity: number;
  unit?: string;
  expiryDate: string;
  daysUntilExpiry: number;
  dailyDemand: number;
  unitsSelledBeforeExpiry: number;
  wasteUnits: number;
  wastePercentage: number;
  riskLevel: string;
  suggestedMarkdown: number;
  potentialLoss: number;
  price: number;
}

interface Summary {
  totalAtRisk: number;
  totalPotentialLoss: number;
  avgWastePercent: number;
  expiringThisWeek: number;
  potentialSavings: number;
  totalProducts: number;
}

// Severity walks down: critical screams, high warns, medium is neutral, low stays quiet
const RISK_STYLES: Record<string, { label: string; signal: string; daysText: string; chart: string }> = {
  critical: { label: "Critical", signal: "fx-signal fx-signal-danger", daysText: "text-danger font-semibold", chart: "var(--danger)" },
  high: { label: "High", signal: "fx-signal fx-signal-warning", daysText: "text-warning font-semibold", chart: "var(--warning)" },
  medium: { label: "Medium", signal: "fx-signal", daysText: "text-secondary-foreground", chart: "var(--chart-3)" },
  low: { label: "Low", signal: "fx-signal", daysText: "text-muted-foreground", chart: "var(--chart-4)" },
};

function RiskBadge({ level }: { level: string }) {
  if (level === "critical") return <span className="fx-badge fx-badge-danger">Critical</span>;
  if (level === "high") return <span className="fx-badge fx-badge-warning">High</span>;
  if (level === "medium") return <span className="fx-badge">Medium</span>;
  return <span className="text-xs text-muted-foreground">Low</span>;
}

// Skeleton mirrors the KPI strip, chart row, and ledger table
function LoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12" aria-busy="true" aria-label="Loading expiry risk">
      <div className="fx-card grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--border)] overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-5 space-y-3">
            <div className="skeleton-shimmer h-3 w-28" />
            <div className="skeleton-shimmer h-7 w-20" />
            <div className="skeleton-shimmer h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="fx-card p-6 space-y-3">
            <div className="skeleton-shimmer h-3.5 w-32" />
            <div className="skeleton-shimmer h-40 w-full" />
          </div>
        ))}
      </div>
      <div className="fx-card p-6">
        <div className="skeleton-shimmer h-3.5 w-44 mb-5" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-b-0">
            <div className="skeleton-shimmer h-3.5 w-1/4" />
            <div className="skeleton-shimmer h-3.5 w-16" />
            <div className="skeleton-shimmer h-3.5 w-14 ml-auto" />
            <div className="skeleton-shimmer h-3.5 w-14" />
            <div className="skeleton-shimmer h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExpiryRiskPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<RiskProduct[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<"risk" | "expiry" | "loss" | "waste">("risk");

  useEffect(() => {
    if (!user) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/expiry-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProducts(data.products || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      setError(err.message || "Failed to load expiry risk data");
    } finally {
      setLoading(false);
    }
  }

  // Group products by week for timeline
  function getTimelineWeeks() {
    const weeks: { label: string; products: RiskProduct[] }[] = [];
    const weekLabels = ["This Week (0-7 days)", "Next Week (8-14 days)", "Week 3 (15-21 days)", "Week 4 (22-30 days)"];
    const weekRanges = [
      [0, 7],
      [8, 14],
      [15, 21],
      [22, 30],
    ];

    weekRanges.forEach(([min, max], i) => {
      const weekProducts = products.filter(
        (p) => p.daysUntilExpiry >= min && p.daysUntilExpiry <= max
      );
      if (weekProducts.length > 0) {
        weeks.push({ label: weekLabels[i], products: weekProducts });
      }
    });

    return weeks;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
        <div role="alert" className="bg-danger-soft border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm">{error}</span>
          <button onClick={fetchData} className="fx-btn">Retry</button>
        </div>
      </div>
    );
  }

  const timelineWeeks = getTimelineWeeks();
  const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === "expiry") return a.daysUntilExpiry - b.daysUntilExpiry;
    if (sortBy === "loss") return b.potentialLoss - a.potentialLoss;
    if (sortBy === "waste") return b.wastePercentage - a.wastePercentage;
    return (riskOrder[a.riskLevel] ?? 4) - (riskOrder[b.riskLevel] ?? 4) || a.daysUntilExpiry - b.daysUntilExpiry;
  });
  const riskChartData = ["critical", "high", "medium", "low"].map((level) => ({
    name: level.charAt(0).toUpperCase() + level.slice(1),
    value: products.filter((p) => p.riskLevel === level).length,
    color: (RISK_STYLES[level] || RISK_STYLES.low).chart,
  })).filter((item) => item.value > 0);
  const categoryWasteData = Object.values(products.reduce((acc: Record<string, { category: string; loss: number; waste: number }>, item) => {
    const key = item.category || "Other";
    if (!acc[key]) acc[key] = { category: key, loss: 0, waste: 0 };
    acc[key].loss += item.potentialLoss || 0;
    acc[key].waste += item.wasteUnits || 0;
    return acc;
  }, {})).sort((a, b) => b.loss - a.loss).slice(0, 8);
  const urgentProducts = sortedProducts.filter((p) => p.riskLevel === "critical" || p.riskLevel === "high").slice(0, 6);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      <div>
        <h1 className="fx-display text-[24px] text-foreground">Expiry & Waste Risk</h1>
        <p className="text-[13px] text-muted-foreground mt-1.5">
          Identify products at risk of expiring and project potential waste losses
        </p>
      </div>

      {/* ── Waste exposure · one ledger strip ─────────────────────── */}
      {summary && (
        <section aria-label="Expiry risk summary" className="fx-card grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--border)] overflow-hidden">
          <div className="p-5 sm:p-6">
            <p className="fx-eyebrow">Products at Risk</p>
            <p className="fx-num fx-metric-xl text-foreground mt-2.5">{summary.totalAtRisk}</p>
            <p className="text-xs text-muted-foreground mt-2.5">of {summary.totalProducts} with expiry dates</p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="fx-eyebrow">Potential Waste Loss</p>
            <p className="fx-num fx-metric-xl text-foreground mt-2.5">
              ₹{summary.totalPotentialLoss.toLocaleString("en-IN")}
            </p>
            <p className={`inline-flex items-center gap-1.5 text-xs mt-2.5 font-medium ${summary.totalPotentialLoss > 0 ? "text-danger" : "text-muted-foreground"}`}>
              <span className={`fx-signal ${summary.totalPotentialLoss > 0 ? "fx-signal-danger" : "fx-signal-success"}`} aria-hidden="true" />
              {summary.totalPotentialLoss > 0 ? "If no action is taken" : "No loss projected"}
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="fx-eyebrow">Average Waste</p>
            <p className="fx-num fx-metric-xl text-foreground mt-2.5">{summary.avgWastePercent}%</p>
            <p className="text-xs text-muted-foreground mt-2.5">Across all tracked products</p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="fx-eyebrow">Expiring This Week</p>
            <p className="fx-num fx-metric-xl text-foreground mt-2.5">{summary.expiringThisWeek}</p>
            <p className={`inline-flex items-center gap-1.5 text-xs mt-2.5 font-medium ${summary.expiringThisWeek > 0 ? "text-warning" : "text-muted-foreground"}`}>
              <span className={`fx-signal ${summary.expiringThisWeek > 0 ? "fx-signal-warning" : "fx-signal-success"}`} aria-hidden="true" />
              {summary.expiringThisWeek > 0 ? "Products in next 7 days" : "Nothing due in 7 days"}
            </p>
          </div>
        </section>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Risk mix */}
          <section aria-label="Risk mix" className="fx-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              <h2 className="text-sm font-semibold text-foreground">Risk Mix</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Red and amber slices need markdown, bundling, or front-shelf placement</p>
            <div role="img" aria-label="Pie chart of the number of products in each expiry risk level: critical, high, medium and low">
              <ResponsiveContainer width="100%" height={CHART_H.standard}>
                <PieChart>
                  <Pie data={riskChartData} dataKey="value" nameKey="name" outerRadius={82} label>
                    {riskChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Loss by category */}
          <section aria-label="Loss by category" className="fx-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <Trash2 className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              <h2 className="text-sm font-semibold text-foreground">Loss by Category</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Where expiry waste blocks the most money</p>
            <div role="img" aria-label="Horizontal bar chart of projected expiry waste loss by product category, highest first">
              <ResponsiveContainer width="100%" height={CHART_H.standard}>
                <BarChart data={categoryWasteData} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid {...gridProps} vertical horizontal={false} />
                  <XAxis type="number" {...axisProps} />
                  <YAxis type="category" dataKey="category" width={96} {...axisProps} fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: "var(--secondary)", opacity: 0.5 }} formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Potential loss"]} />
                  <Bar dataKey="loss" radius={[0, 4, 4, 0]} barSize={14}>
                    {categoryWasteData.map((_, index) => <Cell key={index} fill={chartColor(index)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Action queue */}
          <section aria-label="Action queue" className="fx-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
              <h2 className="text-sm font-semibold text-foreground">Action Queue</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Handle these before reviewing the full table</p>
            <div>
              {urgentProducts.map((product) => {
                const style = RISK_STYLES[product.riskLevel] || RISK_STYLES.low;
                return (
                  <div key={`${product.productName}-${product.expiryDate}`} className="py-3 border-b border-border last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={style.signal} aria-hidden="true" />
                        <span className="text-sm font-medium text-foreground truncate">{product.productName}</span>
                      </span>
                      <span className={`fx-num text-xs shrink-0 ${style.daysText}`}>
                        {product.daysUntilExpiry < 0 ? "Expired" : `${product.daysUntilExpiry}d`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 pl-4">
                      Waste risk <span className="fx-num">{product.wasteUnits}</span> {product.unit || "pcs"} · Loss <span className="fx-num">₹{product.potentialLoss.toLocaleString("en-IN")}</span>
                    </p>
                    <p className="text-xs font-medium text-accent mt-0.5 pl-4">
                      {product.suggestedMarkdown > 0 ? `Run ${product.suggestedMarkdown}% markdown` : "Move to visible shelf and monitor daily"}
                    </p>
                  </div>
                );
              })}
            </div>
            {sortedProducts.filter((p) => p.riskLevel === "critical" || p.riskLevel === "high").length > 6 && (
              <p className="text-xs text-muted-foreground mt-3 fx-rule pt-3">
                Showing top <span className="fx-num">6</span> of <span className="fx-num">{sortedProducts.filter((p) => p.riskLevel === "critical" || p.riskLevel === "high").length}</span> urgent products &mdash; the full list is in the table below.
              </p>
            )}
          </section>
        </div>
      )}

      {/* ── Risk timeline · severity gradient the eye walks down ──── */}
      {timelineWeeks.length > 0 && (
        <section aria-label="Risk timeline" className="fx-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
            <h2 className="fx-display text-[17px] text-foreground">Risk Timeline · Next 30 Days</h2>
          </div>
          <div className="space-y-0">
            {timelineWeeks.map((week, wi) => (
              <div key={week.label} className={`py-4 ${wi > 0 ? "fx-rule" : "pt-0"}`}>
                <h3 className="fx-eyebrow mb-2.5">{week.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {week.products.map((product, idx) => {
                    const style = RISK_STYLES[product.riskLevel] || RISK_STYLES.low;
                    return (
                      <span
                        key={`${product.productName}-${idx}`}
                        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-border bg-background-subtle/60"
                      >
                        <span className={style.signal} aria-hidden="true" />
                        <span className="text-[13px] font-medium text-foreground">{product.productName}</span>
                        <span className={`fx-num text-xs ${style.daysText}`}>{product.daysUntilExpiry}d</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-1 pt-4 fx-rule">
            {Object.entries(RISK_STYLES).map(([level, style]) => (
              <span key={level} className="inline-flex items-center gap-1.5">
                <span className={style.signal} aria-hidden="true" />
                <span className="text-xs text-muted-foreground capitalize">{level}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Product risk ledger ───────────────────────────────────── */}
      {products.length > 0 && (
        <section aria-label="Product risk details" className="fx-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="fx-display text-[17px] text-foreground">Product Risk Details</h2>
            <div className="fx-segment" role="group" aria-label="Sort products">
              {[
                ["risk", "Risk first"],
                ["expiry", "Expiry date"],
                ["loss", "Loss value"],
                ["waste", "Waste %"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortBy(key as typeof sortBy)}
                  aria-pressed={sortBy === key}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="fx-table-scroll -mx-2">
            <table className="fx-table min-w-[960px]">
              <caption className="fx-sr-only">
                Product expiry risk details: category, stock on hand, expiry date, days left, daily demand, units expected to sell before expiry, projected waste units and percentage, risk level, and the suggested markdown action. Days Left, Waste percent and Risk Level are sortable.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Category</th>
                  <th scope="col" className="text-right">Stock</th>
                  <th scope="col">Expiry Date</th>
                  <th scope="col" className="text-right" aria-sort={sortBy === "expiry" ? "ascending" : "none"}>
                    <button type="button" className="fx-sort" onClick={() => setSortBy("expiry")}>
                      Days Left
                      {sortBy === "expiry"
                        ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
                        : <ArrowUpDown className="w-3.5 h-3.5 opacity-60" aria-hidden="true" strokeWidth={2} />}
                    </button>
                  </th>
                  <th scope="col" className="text-right">Daily Demand</th>
                  <th scope="col" className="text-right">Will Sell</th>
                  <th scope="col" className="text-right">Waste Units</th>
                  <th scope="col" className="text-right" aria-sort={sortBy === "waste" ? "descending" : "none"}>
                    <button type="button" className="fx-sort" onClick={() => setSortBy("waste")}>
                      Waste %
                      {sortBy === "waste"
                        ? <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
                        : <ArrowUpDown className="w-3.5 h-3.5 opacity-60" aria-hidden="true" strokeWidth={2} />}
                    </button>
                  </th>
                  <th scope="col" aria-sort={sortBy === "risk" ? "ascending" : "none"}>
                    <button type="button" className="fx-sort" onClick={() => setSortBy("risk")}>
                      Risk Level
                      {sortBy === "risk"
                        ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={2} />
                        : <ArrowUpDown className="w-3.5 h-3.5 opacity-60" aria-hidden="true" strokeWidth={2} />}
                    </button>
                  </th>
                  <th scope="col" className="text-right">Suggested Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((product, idx) => {
                  const style = RISK_STYLES[product.riskLevel] || RISK_STYLES.low;
                  return (
                    <tr key={`${product.productName}-${idx}`}>
                      <td className="font-medium text-foreground">{product.productName}</td>
                      <td className="text-xs text-muted-foreground">{product.category}</td>
                      <td className="text-right fx-num text-muted-foreground">{product.quantity} {product.unit || "pcs"}</td>
                      <td className="fx-num text-secondary-foreground">{formatDate(product.expiryDate)}</td>
                      <td className="text-right">
                        <span className={`fx-num ${style.daysText}`}>
                          {product.daysUntilExpiry < 0 ? "Expired" : `${product.daysUntilExpiry}d`}
                        </span>
                      </td>
                      <td className="text-right fx-num text-secondary-foreground">{product.dailyDemand}</td>
                      <td className="text-right fx-num text-secondary-foreground">{product.unitsSelledBeforeExpiry}</td>
                      <td className={`text-right fx-num ${product.wasteUnits > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {product.wasteUnits}
                      </td>
                      <td className={`text-right fx-num ${product.wastePercentage > 30 ? "font-semibold text-warning" : "text-muted-foreground"}`}>
                        {product.wastePercentage}%
                      </td>
                      <td><RiskBadge level={product.riskLevel} /></td>
                      <td className="text-right">
                        {product.suggestedMarkdown > 0 ? (
                          <span className="fx-badge fx-badge-accent">
                            <TrendingDown className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} />
                            {product.suggestedMarkdown}% off
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">No action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Waste impact summary ──────────────────────────────────── */}
      {summary && (
        <section aria-label="Waste impact summary" className="fx-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
            <h2 className="fx-display text-[17px] text-foreground">Waste Impact Summary</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <div>
              <p className="fx-eyebrow">Total Potential Loss</p>
              <p className="fx-num fx-metric-lg text-danger mt-2">
                ₹{summary.totalPotentialLoss.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">
                This is the estimated revenue loss if products expire unsold at current demand rates.
              </p>
            </div>
            <div className="fx-rule pt-5 md:pt-0 md:border-t-0 md:border-l md:border-[var(--border)] md:pl-8">
              <p className="fx-eyebrow">Recoverable with Markdowns</p>
              <p className="fx-num fx-metric-lg text-success mt-2">
                ₹{summary.potentialSavings.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">
                Estimated revenue recoverable by applying suggested markdown discounts to at-risk products.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {products.length === 0 && !loading && (
        <div className="fx-card py-10 text-center">
          <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
          <p className="text-sm text-secondary-foreground font-medium">No products with expiry dates found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[320px] mx-auto">
            Add expiry dates to your inventory items to start tracking expiry risk.
          </p>
        </div>
      )}
    </div>
  );
}
