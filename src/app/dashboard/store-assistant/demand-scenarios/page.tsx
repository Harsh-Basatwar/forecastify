/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, ArrowLeft, Play, TrendingUp, AlertTriangle } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function DemandScenariosPage() {
  const { callApi } = useStoreAssistant();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState("");
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    callApi("scenario.list").then((res) => {
      if (res) setScenarios(res);
    });
  }, []);

  const handleSimulate = async () => {
    if (!selectedScenario) return;
    setSimulating(true);
    const res = await callApi("scenario.simulate", { scenarioName: selectedScenario });
    if (res) setSimulationResult(res);
    setSimulating(false);
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-accent" /> Demand Shock Simulator
          </h1>
          <p className="text-xs text-muted-foreground">What-if simulations for rain, heatwaves, strikes, price surges & local disruptions</p>
        </div>
      </div>

      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold">Select Shock Scenario</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {scenarios.map((sc) => (
            <button
              key={sc.name}
              onClick={() => setSelectedScenario(sc.name)}
              className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                selectedScenario === sc.name ? "bg-accent/15 border-accent text-accent" : "bg-card border-border/50 hover:border-accent/40"
              }`}
            >
              <span className="font-bold text-xs block">{sc.name}</span>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{sc.description}</p>
            </button>
          ))}
        </div>

        <button
          onClick={handleSimulate}
          disabled={!selectedScenario || simulating}
          className="px-6 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4" /> {simulating ? "Simulating..." : "Run Simulation"}
        </button>
      </div>

      {simulationResult && (
        <div className="fx-card p-6 space-y-6">
          <h2 className="text-base font-bold text-accent">Simulation Results: {simulationResult.scenario_name}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <span className="text-xs text-muted-foreground">Projected Revenue Impact</span>
              <div className="text-2xl font-black text-accent">
                {simulationResult.impact_summary.revenueDelta >= 0 ? "+" : ""}₹{simulationResult.impact_summary.revenueDelta.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/50">
              <span className="text-xs text-muted-foreground">Categories at Risk of Stockout</span>
              <div className="text-2xl font-black text-rose-400">{simulationResult.impact_summary.stockoutRisk} categories</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-muted-foreground">Recommended Actions</h3>
            {(simulationResult.recommended_actions || []).map((act: string, idx: number) => (
              <div key={idx} className="p-3 rounded-lg bg-card/60 border border-border/40 text-xs font-semibold">
                • {act}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
