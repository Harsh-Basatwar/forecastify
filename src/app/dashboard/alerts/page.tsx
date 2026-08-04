"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import {
  CheckCircle2, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Loader2, RefreshCw, Clock, Zap,
  Minus, Mail,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Alert {
  productName: string;
  category: string;
  currentStock: number;
  unit: string;
  severity: "critical" | "warning" | "info";
  alertType: string;
  title: string;
  message: string;
  daysUntilStockout: number;
  demandLevel: "High" | "Medium" | "Low";
  estimatedDailyDemand: number;
  suggestedRestock: number;
  recommendation: string;
  factors: string[];
}

// Severity language: critical screams, warning warns, info stays quiet
const severityConfig = {
  critical: { label: "Critical", badge: "fx-badge fx-badge-danger", signal: "fx-signal fx-signal-danger" },
  warning: { label: "Warning", badge: "fx-badge fx-badge-warning", signal: "fx-signal fx-signal-warning" },
  info: { label: "Info", badge: "fx-badge", signal: "fx-signal fx-signal-accent" },
};

const demandConfig = {
  High: { icon: TrendingUp },
  Medium: { icon: Minus },
  Low: { icon: TrendingDown },
};

// Skeleton rows mirror the alert list to prevent shift
function AlertsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Scanning inventory for alerts">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="fx-card p-5">
          <div className="flex items-start gap-3">
            <div className="skeleton-shimmer h-2 w-2 rounded-full mt-1.5" />
            <div className="flex-1 space-y-2.5">
              <div className="flex gap-2">
                <div className="skeleton-shimmer h-4 w-16" />
                <div className="skeleton-shimmer h-4 w-24" />
              </div>
              <div className="skeleton-shimmer h-3.5 w-48" />
              <div className="skeleton-shimmer h-3 w-2/3" />
            </div>
            <div className="skeleton-shimmer h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AlertsPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState({ critical: 0, warning: 0, info: 0 });
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [generatedAt, setGeneratedAt] = useState("");
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoaded, setWeatherLoaded] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  // Fetch weather + location
  useEffect(() => {
    (async () => {
      try {
        const pos = await new Promise<GeolocationPosition>((r, j) => navigator.geolocation.getCurrentPosition(r, j, { timeout: 10000 }));
        const [wRes, lRes] = await Promise.all([
          fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
          fetch(`/api/location?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
        ]);
        if (wRes.ok) { const d = await wRes.json(); setWeather(d.current); }
        if (lRes.ok) { const d = await lRes.json(); setLocation(d.formattedAddress || d.city || ""); }
      } catch {}
      setWeatherLoaded(true);
    })();
  }, []);

  const fetchAlerts = async () => {
    if (!user) return;
    setLoading(true);
    setEmailSent(false);
    setError("");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, weather, lang }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setError(data.error || "Could not load alerts.");
      if (data.alerts) {
        setAlerts(data.alerts);
        setSummary(data.summary);
        setGeneratedAt(data.generatedAt);
      }
    } catch (err: any) {
      setError(err.message || "Could not load alerts.");
    } finally { setLoading(false); }
  };

  const sendAlertEmail = async () => {
    if (!alerts.length) return;
    setSending(true);
    try {
      const storeName = user?.user_metadata?.store_name || "Store";
      const res = await fetch("/api/send-alert-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alerts, storeName, location }),
      });
      const data = await res.json();
      if (data.sent) setEmailSent(true);
    } catch {} finally { setSending(false); }
  };

  // Fetch once after weather is loaded
  useEffect(() => {
    if (user && weatherLoaded && !hasFetched) {
      setHasFetched(true);
      fetchAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weatherLoaded, hasFetched]);

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.severity === filter);

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto pb-12">
      {/* ── Alert posture · one ledger strip ──────────────────────── */}
      <section aria-label="Alert summary" className="fx-card grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] overflow-hidden">
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Critical Alerts</p>
          <p className="fx-num text-[26px] sm:text-[30px] font-semibold text-foreground mt-2.5 leading-none">{summary.critical}</p>
          <p className={`inline-flex items-center gap-1.5 text-xs mt-2.5 font-medium ${summary.critical > 0 ? "text-danger" : "text-muted-foreground"}`}>
            <span className={`fx-signal ${summary.critical > 0 ? "fx-signal-danger" : "fx-signal-success"}`} aria-hidden="true" />
            {summary.critical > 0 ? "Products at stockout risk" : "No stockout risk"}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Warnings</p>
          <p className="fx-num text-[26px] sm:text-[30px] font-semibold text-foreground mt-2.5 leading-none">{summary.warning}</p>
          <p className={`inline-flex items-center gap-1.5 text-xs mt-2.5 font-medium ${summary.warning > 0 ? "text-warning" : "text-muted-foreground"}`}>
            <span className={`fx-signal ${summary.warning > 0 ? "fx-signal-warning" : "fx-signal-success"}`} aria-hidden="true" />
            {summary.warning > 0 ? "Low stock items" : "Stock levels healthy"}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="fx-eyebrow">Informational</p>
          <p className="fx-num text-[26px] sm:text-[30px] font-semibold text-foreground mt-2.5 leading-none">{summary.info}</p>
          <p className="text-xs text-muted-foreground mt-2.5">Overstock &amp; demand spikes</p>
        </div>
      </section>

      {/* ── Filter + actions · quiet toolbar ──────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-0.5 bg-secondary rounded-[var(--radius-md)] p-0.5 overflow-x-auto" role="tablist" aria-label="Filter alerts by severity">
          {["all", "critical", "warning", "info"].map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-[calc(var(--radius-md)-2px)] text-xs font-medium whitespace-nowrap fx-focus ${
                filter === f ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? `All (${alerts.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${alerts.filter(a => a.severity === f).length})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {generatedAt && (
            <span className="fx-num text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} />
              {new Date(generatedAt).toLocaleTimeString("en-IN")}
            </span>
          )}
          {alerts.length > 0 && (
            <button onClick={sendAlertEmail} disabled={sending || emailSent} className="fx-btn">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : emailSent ? <CheckCircle2 className="w-3.5 h-3.5 text-success" aria-hidden="true" strokeWidth={1.8} /> : <Mail className="w-3.5 h-3.5" aria-hidden="true" strokeWidth={1.8} />}
              {sending ? "Sending..." : emailSent ? "Email Sent" : "Email Alerts"}
            </button>
          )}
          <button onClick={fetchAlerts} disabled={loading} aria-label="Refresh alerts" className="fx-btn fx-btn-ghost">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-danger/8 border border-danger/25 rounded-[var(--radius-md)] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-danger">{error}</span>
          <button onClick={fetchAlerts} className="fx-btn">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && !alerts.length && <AlertsSkeleton />}

      {/* Alerts list */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((alert, idx) => {
            const config = severityConfig[alert.severity];
            const demand = demandConfig[alert.demandLevel] || demandConfig.Medium;
            const DemandIcon = demand.icon;
            const isExpanded = expandedId === idx;
            const safeStock = alert.estimatedDailyDemand * 14; // 14-day supply = 100%
            const stockPercent = safeStock > 0 ? Math.round((alert.currentStock / safeStock) * 100) : 0;

            return (
              <div key={idx} className="fx-card fx-card-interactive overflow-hidden">
                {/* Header */}
                <button onClick={() => setExpandedId(isExpanded ? null : idx)} aria-expanded={isExpanded} className="w-full text-left p-4 sm:p-5 fx-focus">
                  <div className="flex items-start gap-3">
                    <span className={`${config.signal} mt-1.5 shrink-0`} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={config.badge}>{config.label}</span>
                        <span className="fx-badge capitalize">{alert.alertType.replace(/_/g, " ")}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <DemandIcon className="w-3 h-3" aria-hidden="true" strokeWidth={1.8} />{alert.demandLevel} Demand
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground mt-1.5">{alert.productName}</p>
                      <p className="text-[13px] text-muted-foreground mt-0.5">{alert.message}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {alert.daysUntilStockout > 0 && alert.daysUntilStockout < 30 && (
                        <span className={`fx-num text-xs font-semibold ${alert.daysUntilStockout <= 2 ? "text-danger" : alert.daysUntilStockout <= 5 ? "text-warning" : "text-secondary-foreground"}`}>
                          {alert.daysUntilStockout}d left
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} /> : <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} />}
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 border-t border-border">
                    <div className="pt-4 space-y-4">
                      {/* Stock bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="fx-eyebrow text-[10px]">Stock Level</span>
                          <span className="fx-num text-xs font-semibold text-foreground">{alert.currentStock} {alert.unit} in stock</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.min(stockPercent, 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Stock level against 14-day supply">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(stockPercent, 100)}%`,
                              background: stockPercent <= 20 ? "var(--danger)" : stockPercent <= 50 ? "var(--warning)" : stockPercent >= 90 ? "var(--accent)" : "var(--success)",
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="fx-num text-[10px] text-muted-foreground">0</span>
                          <span className="fx-num text-[10px] text-muted-foreground">{stockPercent}% of 14-day supply</span>
                          <span className="fx-num text-[10px] text-muted-foreground">{safeStock} {alert.unit}</span>
                        </div>
                      </div>

                      {/* Stats — plain cells, no boxes */}
                      <div className="grid grid-cols-3 gap-4 fx-rule pt-4">
                        <div>
                          <p className="fx-eyebrow text-[10px]">Daily Demand</p>
                          <p className="fx-num text-lg font-semibold text-foreground mt-1">{alert.estimatedDailyDemand} <span className="text-xs font-normal text-muted-foreground">{alert.unit}/day</span></p>
                        </div>
                        <div>
                          <p className="fx-eyebrow text-[10px]">Days Until Stockout</p>
                          <p className={`fx-num text-lg font-semibold mt-1 ${alert.daysUntilStockout > 0 && alert.daysUntilStockout <= 2 ? "text-danger" : alert.daysUntilStockout > 0 && alert.daysUntilStockout <= 5 ? "text-warning" : "text-foreground"}`}>
                            {alert.daysUntilStockout > 0 ? alert.daysUntilStockout : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="fx-eyebrow text-[10px]">Restock Qty</p>
                          <p className="fx-num text-lg font-semibold mt-1" style={{ color: "var(--accent)" }}>+{Math.max(0, alert.suggestedRestock)} <span className="text-xs font-normal text-muted-foreground">{alert.unit}</span></p>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="rounded-[var(--radius-md)] p-4 border" style={{ background: "var(--accent-soft)", borderColor: "var(--accent-border)" }}>
                        <p className="fx-eyebrow mb-1.5" style={{ color: "var(--accent)" }}>Recommendation</p>
                        <p className="text-sm text-foreground leading-relaxed">{alert.recommendation}</p>
                      </div>

                      {/* Factors */}
                      {alert.factors?.length > 0 && (
                        <div>
                          <p className="fx-eyebrow mb-2">Contributing Factors</p>
                          <div className="flex flex-wrap gap-1.5">
                            {alert.factors.map((f, i) => (
                              <span key={i} className="fx-badge">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && alerts.length === 0 && (
        <div className="fx-card py-10 text-center">
          <span className="fx-signal fx-signal-success mx-auto mb-3 block" aria-hidden="true" />
          <p className="text-sm text-secondary-foreground font-medium">All Clear</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            No stock alerts right now. Your inventory levels look healthy. We check stock levels, demand patterns, and upcoming events to keep you ahead.
          </p>
        </div>
      )}

      {/* Demand legend */}
      {alerts.length > 0 && (
        <section aria-label="Demand categories" className="fx-card p-6">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" aria-hidden="true" strokeWidth={1.8} /> Demand Categories
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
            <div className="flex items-start gap-2.5">
              <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} />
              <div>
                <p className="text-sm font-semibold text-foreground">High Demand</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">10+ units sold daily. Restock immediately if below minimum. These products drive footfall.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Minus className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} />
              <div>
                <p className="text-sm font-semibold text-foreground">Medium Demand</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">3-10 units daily. Monitor weekly. Restock when below 7-day supply threshold.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <TrendingDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" strokeWidth={1.8} />
              <div>
                <p className="text-sm font-semibold text-foreground">Low Demand</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Under 3 units daily. Keep minimal stock. Risk of overstock and expiry if overstocked.</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
