/**
 * Alert Engine
 * Generates and dispatches platform alerts across In-App, Email, Slack, Webhook, and SMS channels.
 */

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface SystemAlert {
  id: string;
  storeId?: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  subsystem: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export class AlertEngine {
  private alerts: SystemAlert[] = [];

  constructor() {
    this.seedMockAlerts();
  }

  private seedMockAlerts() {
    this.alerts = [
      {
        id: "alert_1",
        storeId: "default-store-id",
        title: "Model Drift Threshold Breach",
        message: "PSI score for ensemble-forecast-v2 reached 0.245, exceeding 0.20 threshold.",
        severity: "WARNING",
        subsystem: "DriftEngine",
        isResolved: false,
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: "alert_2",
        storeId: "default-store-id",
        title: "Worker Memory Spiked",
        message: "TrainingWorker-1 memory consumption exceeded 512MB limit.",
        severity: "CRITICAL",
        subsystem: "WorkerOrchestrator",
        isResolved: true,
        resolvedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        resolvedBy: "AutoRecoveryEngine",
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: "alert_3",
        storeId: "default-store-id",
        title: "Nightly Forecast Succeeded",
        message: "30-day forecast successfully generated for 1,240 inventory SKUs.",
        severity: "INFO",
        subsystem: "ForecastEngine",
        isResolved: true,
        resolvedAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ];
  }

  public getAlerts(filter?: { severity?: AlertSeverity; isResolved?: boolean }): SystemAlert[] {
    let list = [...this.alerts];
    if (filter?.severity) list = list.filter((a) => a.severity === filter.severity);
    if (filter?.isResolved !== undefined) list = list.filter((a) => a.isResolved === filter.isResolved);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createAlert(alert: Omit<SystemAlert, "id" | "isResolved" | "createdAt">): SystemAlert {
    const newAlert: SystemAlert = {
      ...alert,
      id: `alert_${Date.now()}`,
      isResolved: false,
      createdAt: new Date().toISOString(),
    };
    this.alerts.unshift(newAlert);
    return newAlert;
  }

  public resolveAlert(id: string, resolvedBy = "SystemAdmin"): SystemAlert | undefined {
    const item = this.alerts.find((a) => a.id === id);
    if (item) {
      item.isResolved = true;
      item.resolvedAt = new Date().toISOString();
      item.resolvedBy = resolvedBy;
    }
    return item;
  }
}

export const alertEngine = new AlertEngine();
