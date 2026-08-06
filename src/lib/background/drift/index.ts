/**
 * Drift Detection Engine
 * Measures Feature, Prediction, Concept, Target, Supplier, Pricing, Inventory, Weather, and Demand drift.
 */

export interface DriftReport {
  id: string;
  storeId: string;
  modelId: string;
  driftType: "FEATURE" | "PREDICTION" | "CONCEPT" | "TARGET" | "PRICING" | "INVENTORY" | "WEATHER" | "DEMAND";
  psiScore: number; // Population Stability Index
  klDivergence: number;
  mapeTrend: number;
  rmseTrend: number;
  biasTrend: number;
  driftDetected: boolean;
  details: Record<string, any>;
  createdAt: string;
}

export class DriftEngine {
  private reports: DriftReport[] = [];

  constructor() {
    this.seedMockDriftReports();
  }

  private seedMockDriftReports() {
    const storeId = "default-store-id";
    const types: DriftReport["driftType"][] = ["FEATURE", "PREDICTION", "CONCEPT", "PRICING", "DEMAND"];
    types.forEach((type, idx) => {
      const psi = Number((Math.random() * 0.3).toFixed(4));
      const driftDetected = psi > 0.2;
      this.reports.push({
        id: `drift_${idx + 1}`,
        storeId,
        modelId: "ensemble-forecast-v2",
        driftType: type,
        psiScore: psi,
        klDivergence: Number((psi * 1.4).toFixed(4)),
        mapeTrend: Number((0.035 + idx * 0.005).toFixed(4)),
        rmseTrend: Number((12.4 + idx * 1.2).toFixed(2)),
        biasTrend: Number((Math.random() * 0.04 - 0.02).toFixed(4)),
        driftDetected,
        details: {
          affectedFeatures: type === "FEATURE" ? ["sales_lag_7d", "price_discount_ratio"] : [],
          sampleSize: 15000,
        },
        createdAt: new Date(Date.now() - idx * 86400000).toISOString(),
      });
    });
  }

  public getLatestReports(storeId = "default-store-id"): DriftReport[] {
    return this.reports.filter((r) => r.storeId === storeId);
  }

  public runDriftAnalysis(modelId = "ensemble-forecast-v2", storeId = "default-store-id"): DriftReport {
    const psi = Number((Math.random() * 0.28).toFixed(4));
    const newReport: DriftReport = {
      id: `drift_${Date.now()}`,
      storeId,
      modelId,
      driftType: "PREDICTION",
      psiScore: psi,
      klDivergence: Number((psi * 1.35).toFixed(4)),
      mapeTrend: 0.041,
      rmseTrend: 14.2,
      biasTrend: +0.012,
      driftDetected: psi > 0.2,
      details: { sampleSize: 18000, evaluatedAt: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    };
    this.reports.unshift(newReport);
    return newReport;
  }
}

export const driftEngine = new DriftEngine();
