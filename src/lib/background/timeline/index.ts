/**
 * Operational Timeline
 * Consolidated enterprise timeline feed of system events and operations.
 */

export interface OperationalTimelineItem {
  id: string;
  timestamp: string;
  eventType: string;
  summary: string;
  actor: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

export class OperationalTimeline {
  public getTimelineItems(): OperationalTimelineItem[] {
    return [
      { id: "tl_1", timestamp: new Date(Date.now() - 1200000).toISOString(), eventType: "FORECAST_GENERATED", summary: "30-day forecast updated for Store A", actor: "ForecastWorker-1", severity: "INFO" },
      { id: "tl_2", timestamp: new Date(Date.now() - 3600000).toISOString(), eventType: "DRIFT_DETECTED", summary: "Feature drift PSI 0.245 on sales_lag_7d", actor: "DriftEngine", severity: "WARNING" },
      { id: "tl_3", timestamp: new Date(Date.now() - 7200000).toISOString(), eventType: "MODEL_PROMOTED", summary: "Challenger ensemble-v3.0 promoted to Champion", actor: "RetrainingOrchestrator", severity: "INFO" },
      { id: "tl_4", timestamp: new Date(Date.now() - 14400000).toISOString(), eventType: "BACKUP_COMPLETED", summary: "Daily full snapshot backup succeeded", actor: "BackupManager", severity: "INFO" },
    ];
  }
}

export const operationalTimeline = new OperationalTimeline();
