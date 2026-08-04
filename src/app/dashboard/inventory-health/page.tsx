/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  Shield, TrendingUp, Activity, BarChart3, Package,
} from "lucide-react";

// Grade ramp walks from healthy-quiet to critical: A calm, F loud
const GRADE_COLORS: Record<string, string> = {
  A: "var(--success)",
  B: "var(--accent)",
  C: "#C0A46B",
  D: "var(--warning)",
  F: "var(--danger)",
};

const GRADE_BADGE: Record<string, string> = {
  A: "fx-badge fx-badge-success",
  B: "fx-badge fx-badge-accent",
  C: "fx-badge",
  D: "fx-badge fx-badge-warning",
  F: "fx-badge fx-badge-danger",
};

function getScoreColor(score: number): string {
  if (score > 80) return "var(--success)";
  if (score > 60) return "var(--warning)";
  return "var(--danger)";
}

function getScoreSignal(score: number): string {
  if (score > 80) return "fx-signal fx-signal-success";
  if (score > 60) return "fx-signal fx-signal-warning";
  return "fx-signal fx-signal-danger";
}

function getCategoryBarColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--warning)";
  return "var(--danger)";
}

const chartTooltipStyle = {
  background: "var(--elevated)",
  border: "1px solid var(--border-strong)",
  borderRadius: "10px",
  boxShadow: "var(--shadow-md)",
  fontSize: "12px",
  color: "var(--foreground)",
} as const;

// Skeleton mirrors score ring, factor grid, charts, and the ledger table
function LoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12" aria-busy="true" aria-label="Loading inventory health">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="fx-card p-6 flex flex-col items-center justify-center space-y-4">
          <div className="skeleton-shimmer h-36 w-36 rounded-full" />
          <div className="skeleton-shimmer h-3.5 w-32" />
        </div>
        <div className="fx-card lg:col-span-2 grid grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-5 space-y-3 border-b border-r border-border">
              <div className="skeleton-shimmer h-3 w-28" />
              <div className="skeleton-shimmer h-6 w-16" />
              <div className="skeleton-shimmer h-1.5 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="fx-card p-6 space-y-3">
            <div className="skeleton-shimmer h-3.5 w-40" />
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
            <div className="skeleton-shimmer h-3.5 w-12 ml-auto" />
            <div className="skeleton-shimmer h-3.5 w-12" />
            <div className="skeleton-shimmer h-3.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InventoryHealthPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [sortKey, setSortKey] = useState<string>("healthScore");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/inventory-health", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch inventory health:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const sortedProducts = data?.products?.slice().sort((a: any, b: any) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string") return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!data || !data.products?.length) {
    return (
      <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
        <div className="fx-card py-10 text-center">
          <Package className="w-5 h-5 text-muted-foreground mx-auto mb-3 opacity-50" aria-hidden="true" strokeWidth={1.8} />
          <p className="text-sm text-secondary-foreground font-medium">No inventory data found</p>
          <p className="text-xs text-muted-foreground mt-1">Add products to your inventory to generate a health analysis.</p>
        </div>
      </div>
    );
  }

  const { overallScore, factorAverages, distribution, categoryScores } = data;
  const scoreColor = getScoreColor(overallScore);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (overallScore / 100) * circumference;

  const factors = [
    { label: "Stock Level", value: factorAverages.stockLevel, max: 25, icon: Package },
    { label: "Demand Alignment", value: factorAverages.demandAlignment, max: 25, icon: TrendingUp },
    { label: "Volatility", value: factorAverages.volatility, max: 25, icon: Activity },
    { label: "Trend Direction", value: factorAverages.trend, max: 25, icon: BarChart3 },
  ];

  const gradeOrder = ["A", "B", "C", "D", "F"];
  const totalProducts = data.products.length;
  const gradeData = gradeOrder.map(g => ({ grade: g, count: distribution[g] || 0 }));

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* ── Score + factor breakdown ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall score ring */}
        <section aria-label="Store health score" className="fx-card p-6 flex flex-col items-center justify-center">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
              <circle cx="80" cy="80" r="70" fill="none" stroke="var(--muted)" strokeWidth="7" />
              <circle
                cx="80" cy="80" r="70" fill="none"
                stroke={scoreColor} strokeWidth="7" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="fx-num text-[34px] font-semibold text-foreground leading-none">{overallScore}</span>
              <span className="fx-eyebrow mt-1.5 text-[9px]">of 100</span>
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-secondary-foreground">Store Health Score</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium mt-1.5" style={{ color: scoreColor }}>
            <span className={getScoreSignal(overallScore)} aria-hidden="true" />
            {overallScore > 80 ? "Healthy" : overallScore > 60 ? "Needs Attention" : "Critical"}
          </span>
        </section>

        {/* Factor breakdown — one sheet, hairline-divided */}
        <section aria-label="Health factors" className="fx-card lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-[var(--border)] overflow-hidden">
          <div className="grid grid-rows-2 divide-y divide-[var(--border)] sm:border-r sm:border-[var(--border)]">
            {factors.slice(0, 2).map((f) => (
              <div key={f.label} className="p-5 sm:p-6">
                <p className="fx-eyebrow flex items-center gap-1.5">
                  <f.icon className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> {f.label}
                </p>
                <p className="mt-2.5">
                  <span className="fx-num text-[24px] font-semibold text-foreground leading-none">{f.value}</span>
                  <span className="text-sm text-muted-foreground ml-1">/ {f.max}</span>
                </p>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-3" role="progressbar" aria-valuenow={f.value} aria-valuemin={0} aria-valuemax={f.max} aria-label={f.label}>
                  <div className="h-full rounded-full" style={{ width: `${(f.value / f.max) * 100}%`, background: "var(--accent)", transition: "width 700ms cubic-bezier(0.16, 1, 0.3, 1)" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-rows-2 divide-y divide-[var(--border)]">
            {factors.slice(2).map((f) => (
              <div key={f.label} className="p-5 sm:p-6">
                <p className="fx-eyebrow flex items-center gap-1.5">
                  <f.icon className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} /> {f.label}
                </p>
                <p className="mt-2.5">
                  <span className="fx-num text-[24px] font-semibold text-foreground leading-none">{f.value}</span>
                  <span className="text-sm text-muted-foreground ml-1">/ {f.max}</span>
                </p>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-3" role="progressbar" aria-valuenow={f.value} aria-valuemin={0} aria-valuemax={f.max} aria-label={f.label}>
                  <div className="h-full rounded-full" style={{ width: `${(f.value / f.max) * 100}%`, background: "var(--accent)", transition: "width 700ms cubic-bezier(0.16, 1, 0.3, 1)" }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Grade distribution + category health ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade distribution */}
        <section aria-label="Grade distribution" className="fx-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
            <h2 className="text-sm font-semibold text-foreground">Grade Distribution</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Products graded A (healthy) through F (critical)</p>
          <div className="space-y-4">
            {gradeData.map((g) => (
              <div key={g.grade} className="flex items-center gap-3">
                <span className="fx-num w-6 text-sm font-semibold text-foreground">{g.grade}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden" aria-hidden="true">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: totalProducts > 0 ? `${Math.max((g.count / totalProducts) * 100, g.count > 0 ? 4 : 0)}%` : "0%",
                      background: GRADE_COLORS[g.grade],
                      transition: "width 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </div>
                <span className="fx-num text-xs text-muted-foreground w-20 text-right">
                  {g.count} product{g.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Per-category health bar chart */}
        <section aria-label="Category health" className="fx-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
            <h2 className="text-sm font-semibold text-foreground">Category Health</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Average health score per category</p>
          <ResponsiveContainer width="100%" height={Math.max(categoryScores.length * 40, 200)}>
            <BarChart data={categoryScores} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="4 6" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="category" width={100} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ fill: "var(--secondary)", opacity: 0.5 }}
                formatter={(value: any) => [`${value}`, "Health Score"]}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={14}>
                {categoryScores.map((entry: any, idx: number) => (
                  <Cell key={idx} fill={getCategoryBarColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* ── Product health ledger ─────────────────────────────────── */}
      <section aria-label="Product health details" className="fx-card p-6">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="fx-display text-[17px] text-foreground">Product Health Details</h2>
          <span className="fx-num text-xs text-muted-foreground">{data.products.length} products</span>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="fx-table min-w-[760px]">
            <thead>
              <tr>
                {[
                  { key: "productName", label: "Product" },
                  { key: "category", label: "Category" },
                  { key: "healthScore", label: "Health Score" },
                  { key: "stockLevel", label: "Stock Level" },
                  { key: "demandAlignment", label: "Demand Fit" },
                  { key: "volatility", label: "Volatility" },
                  { key: "trend", label: "Trend" },
                  { key: "grade", label: "Grade" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    aria-sort={sortKey === col.key ? (sortAsc ? "ascending" : "descending") : undefined}
                    className="cursor-pointer hover:text-foreground transition-colors select-none"
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <span className="ml-1" aria-hidden="true">{sortAsc ? "▲" : "▼"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedProducts?.map((p: any, i: number) => (
                <tr key={i}>
                  <td className="font-medium text-foreground">{p.productName}</td>
                  <td className="text-xs text-muted-foreground">{p.category}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={getScoreSignal(p.healthScore)} aria-hidden="true" />
                      <span className="fx-num text-sm font-semibold text-foreground">{p.healthScore}</span>
                    </span>
                  </td>
                  <td className="fx-num text-secondary-foreground">{p.stockLevel}/25</td>
                  <td className="fx-num text-secondary-foreground">{p.demandAlignment}/25</td>
                  <td className="fx-num text-secondary-foreground">{p.volatility}/25</td>
                  <td className="fx-num text-secondary-foreground">{p.trend}/25</td>
                  <td><span className={GRADE_BADGE[p.grade] || "fx-badge"}>{p.grade}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
