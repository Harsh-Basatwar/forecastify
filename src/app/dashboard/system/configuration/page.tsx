"use client";

import { useEffect, useState } from "react";
import { Sliders, RefreshCw, CheckCircle, Save } from "lucide-react";
import { ConfigurationItem } from "@/lib/background/config";

export default function ConfigurationDashboardPage() {
  const [configs, setConfigs] = useState<ConfigurationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchConfigs() {
    setLoading(true);
    try {
      const res = await fetch("/api/background/config");
      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function handleToggle(key: string, currentValue: any) {
    const newValue = typeof currentValue === "boolean" ? !currentValue : currentValue;
    await fetch("/api/background/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: newValue }),
    });
    fetchConfigs();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sliders className="w-7 h-7 text-accent" />
            Configuration & Feature Flags
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dynamic runtime environment overrides, store-level settings, and feature flags.
          </p>
        </div>
        <button
          onClick={fetchConfigs}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Registry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((c) => (
          <div key={c.key} className="p-5 rounded-xl bg-card/50 border border-border/60 backdrop-blur flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent/10 text-accent">
                {c.category}
              </span>
              <h3 className="text-sm font-bold text-foreground font-mono mt-1">{c.key}</h3>
              <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
            </div>
            <div>
              {typeof c.value === "boolean" ? (
                <button
                  onClick={() => handleToggle(c.key, c.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    c.value ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.value ? "ENABLED" : "DISABLED"}
                </button>
              ) : (
                <span className="font-mono text-sm font-bold text-foreground px-3 py-1 rounded bg-card/80 border border-border/40">
                  {String(c.value)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
