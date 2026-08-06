/**
 * Retraining Orchestrator
 * Controls manual, scheduled, drift-threshold, and event-based model retraining and approval workflows.
 */

import { jobQueue } from "../queue";

export interface RetrainingLog {
  id: string;
  storeId: string;
  triggerType: "MANUAL" | "SCHEDULED" | "DRIFT_THRESHOLD" | "EVENT";
  championModelId: string;
  challengerModelId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED" | "APPROVED" | "REJECTED";
  startedAt: string;
  completedAt?: string;
  metricsComparison?: {
    championMape: number;
    challengerMape: number;
    improvementPct: number;
  };
}

export class RetrainingOrchestrator {
  private history: RetrainingLog[] = [];

  constructor() {
    this.history.push({
      id: "retrain_log_1",
      storeId: "default-store-id",
      triggerType: "DRIFT_THRESHOLD",
      championModelId: "lightgbm-v2.1",
      challengerModelId: "ensemble-v3.0",
      status: "APPROVED",
      startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      completedAt: new Date(Date.now() - 86400000 * 1.9).toISOString(),
      metricsComparison: {
        championMape: 0.048,
        challengerMape: 0.038,
        improvementPct: 20.8,
      },
    });
  }

  public getRetrainingHistory(storeId = "default-store-id"): RetrainingLog[] {
    return this.history.filter((h) => h.storeId === storeId);
  }

  public triggerRetraining(
    triggerType: RetrainingLog["triggerType"],
    storeId = "default-store-id",
    championId = "lightgbm-v2.1"
  ): RetrainingLog {
    const challengerId = `challenger_${Date.now().toString(36)}`;
    const log: RetrainingLog = {
      id: `retrain_${Date.now()}`,
      storeId,
      triggerType,
      championModelId: championId,
      challengerModelId: challengerId,
      status: "IN_PROGRESS",
      startedAt: new Date().toISOString(),
    };
    this.history.unshift(log);

    // Enqueue training job
    jobQueue.enqueue({
      storeId,
      jobType: "MODEL_RETRAINING_CHAMPION",
      priority: 1,
      payload: { challengerModelId: challengerId, triggerType },
      maxAttempts: 3,
      scheduledAt: new Date().toISOString(),
    });

    return log;
  }

  public approveDeployment(retrainingId: string): RetrainingLog | undefined {
    const item = this.history.find((h) => h.id === retrainingId);
    if (item) {
      item.status = "APPROVED";
      item.completedAt = new Date().toISOString();
    }
    return item;
  }
}

export const retrainingOrchestrator = new RetrainingOrchestrator();
