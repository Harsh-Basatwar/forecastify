/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Target, TrendingUp, Activity, CheckCircle } from "lucide-react";
import {
  chartColor, SERIES, DASH, tooltipStyle, tooltipLabelStyle,
  gridProps, axisProps, CHART_H,
} from "@/lib/chart-theme";

function accuracyColor(acc: number) {
  if (acc >= 85) return "text-success";
  if (acc >= 70) return "text-warning";
  return "text-danger";
}

function accuracyBadge(acc: number) {
  if (acc >= 85) return "fx-badge fx-badge-success";
  if (acc >= 70) return "fx-badge fx-badge-warning";
  return "fx-badge fx-badge-danger";
}

function accuracySignal(acc: number) {
  if (acc >= 85) return "fx-signal fx-signal-success";
  if (acc >= 70) return "fx-signal fx-signal-warning";
  return "fx-signal fx-signal-danger";
}

// Contextual skeleton — mirrors the real layout to prevent shift
function LoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12" aria-busy="true" aria-label="Loading model accuracy">
      <div className="space-y-3">
        <div className="skeleton-shimmer h-7 w-56" />
        <div className="skeleton-shimmer h-3.5 w-72" />
      </div>
      <div className="fx-card grid grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="p-6 space-y-3 border-r border-border last:border-r-0">
            <div className="skeleton-shimmer h-3 w-16" />
            <div className="skeleton-shimmer h-8 w-24" />
            <div className="skeleton-shimmer h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="fx-card p-6 space-y-4">
        <div className="skeleton-shimmer h-4 w-52" />
        <div className="skeleton-shimmer h-64 w-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="fx-card p-6 space-y-3">
          <div className="skeleton-shimmer h-4 w-44" />
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton-shimmer h-9 w-full" />)}
        </div>
        <div className="fx-card p-6 space-y-3">
          <div className="skeleton-shimmer h-4 w-44" />
          <div className="skeleton-shimmer h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ModelAccuracyPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAccuracy = useCallback(async () => {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/model-accuracy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        const d = await res.json();
        if (!d.error) setData(d);
        else setError(d.error);
      } catch { setError("Failed to load accuracy data."); } finally {
        setLoading(false);
      }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadAccuracy();
  }, [user, loadAccuracy]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
        <div role="alert" className="bg-danger-soft border border-danger/25 text-danger rounded-[var(--radius-md)] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm">{error}</span>
          <button onClick={loadAccuracy} className="fx-btn">Retry</button>
        </div>
      </div>
    );
  }

  if (!data || data.matchedCount === 0) {
    return (
      <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
        <div className="fx-card flex flex-col items-center justify-center text-center py-16 px-6">
          <Target className="w-5 h-5 text-muted-foreground mb-3 opacity-60" aria-hidden="true" strokeWidth={1.8} />
          <p className="text-sm text-secondary-foreground font-medium">No accuracy data available</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[320px]">Forecast data for past dates is needed to compute accuracy.</p>
        </div>
      </div>
    );
  }

  const { mape, rmse, mae, accuracy, productAccuracy, dailyTrend, categoryAccuracy, matchedCount } = data;

  const stats = [
    {
      label: "MAPE",
      value: `${mape}%`,
      subtitle: "Mean Absolute % Error",
      icon: Activity,
      acc: 100 - mape,
    },
    {
      label: "RMSE",
      value: rmse.toFixed(1),
      subtitle: "Root Mean Square Error",
      icon: TrendingUp,
      acc: accuracy,
    },
    {
      label: "MAE",
      value: mae.toFixed(1),
      subtitle: "Mean Absolute Error",
      icon: Target,
      acc: accuracy,
    },
    {
      label: "Accuracy",
      value: `${accuracy}%`,
      subtitle: `Based on ${matchedCount} predictions`,
      icon: CheckCircle,
      acc: accuracy,
    },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Page lead — editorial, no card */}
      <div>
        <h1 className="fx-display text-[24px] text-foreground">
          {t("nav.modelAccuracy")}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1.5">
          How well our demand forecasts match actual sales
        </p>
      </div>

      {/* Error metrics — one ledger sheet */}
      <section aria-label="Accuracy metrics" className="fx-card grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--border)] overflow-hidden">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="fx-eyebrow">{s.label}</p>
                <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
              </div>
              <p className={`fx-num fx-metric-xl mt-2.5 ${accuracyColor(s.acc)}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-2.5">{s.subtitle}</p>
            </div>
          );
        })}
      </section>

      {/* Accuracy Trend Chart */}
      <section aria-label="Daily accuracy trend" className="fx-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-accent" aria-hidden="true" strokeWidth={1.8} />
          <h3 className="text-sm font-semibold text-foreground">Daily Accuracy Trend (Last 14 Days)</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Daily forecast-vs-actual accuracy across the matched window</p>
        <div role="img" aria-label="Area chart of daily forecast accuracy percentage over the last fourteen days">
          <ResponsiveContainer width="100%" height={CHART_H.tall}>
            <AreaChart data={dailyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="gAccuracy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} dy={6} />
              <YAxis domain={[0, 100]} {...axisProps} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
                formatter={(value: any) => [`${value}%`, "Accuracy"]}
              />
              <Area
                type="monotone"
                dataKey="accuracy"
                name="Accuracy"
                stroke={SERIES.primary}
                fill="url(#gAccuracy)"
                strokeWidth={2}
                strokeDasharray={DASH.solid}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per-Product Accuracy Table */}
        <section aria-label="Per-product accuracy" className="fx-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
            <h3 className="text-sm font-semibold text-foreground">Per-Product Accuracy</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Predicted vs actual units per product</p>
          <div className="fx-table-scroll -mx-2">
            <table className="fx-table min-w-[480px]">
              <caption className="fx-sr-only">
                Per-product forecast accuracy: predicted units, actual units sold, percentage error, and accuracy percentage.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col" className="text-right">Predicted</th>
                  <th scope="col" className="text-right">Actual</th>
                  <th scope="col" className="text-right">Error%</th>
                  <th scope="col" className="text-right">Accuracy%</th>
                </tr>
              </thead>
              <tbody>
                {productAccuracy.map((p: any) => (
                  <tr key={p.product}>
                    <td className="font-medium text-foreground">{p.product}</td>
                    <td className="text-right fx-num text-muted-foreground">{p.predicted}</td>
                    <td className="text-right fx-num text-muted-foreground">{p.actual}</td>
                    <td className="text-right fx-num text-muted-foreground">{p.errorPct}%</td>
                    <td className="text-right">
                      <span className={`${accuracyBadge(p.accuracy)} fx-num`}>{p.accuracy}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Per-Category Accuracy Bar Chart */}
        <section aria-label="Accuracy by category" className="fx-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />
            <h3 className="text-sm font-semibold text-foreground">Accuracy by Category</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Category-level forecast reliability</p>
          <div role="img" aria-label="Horizontal bar chart of forecast accuracy percentage for each product category">
            <ResponsiveContainer width="100%" height={CHART_H.tall}>
              <BarChart data={categoryAccuracy} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...gridProps} vertical horizontal={false} />
                <XAxis type="number" domain={[0, 100]} {...axisProps} />
                <YAxis
                  type="category"
                  dataKey="category"
                  {...axisProps}
                  width={100}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  cursor={{ fill: "var(--secondary)", opacity: 0.5 }}
                  formatter={(value: any) => [`${value}%`, "Accuracy"]}
                />
                <Bar dataKey="accuracy" name="Accuracy" radius={[0, 4, 4, 0]} barSize={14}>
                  {categoryAccuracy.map((_: any, i: number) => (
                    <Cell key={i} fill={chartColor(i)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <span className={accuracySignal(accuracy)} aria-hidden="true" />
            Overall accuracy {accuracy}% across {matchedCount} matched predictions
          </p>
        </section>
      </div>
    </div>
  );
}
