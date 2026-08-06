/**
 * Enterprise Scheduler
 * Manages Cron, Delayed, Event-Driven, Manual, Priority, and Batch Schedules.
 */

import { jobQueue } from "../queue";

export interface ScheduledTask {
  id: string;
  taskName: string;
  cronExpression: string;
  jobType: string;
  payload: Record<string, any>;
  isEnabled: boolean;
  lastRunAt?: string;
  nextRunAt: string;
  totalRuns: number;
  priority: number;
}

export class EnterpriseScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();

  constructor() {
    this.registerDefaultTasks();
  }

  private registerDefaultTasks() {
    const defaults: Omit<ScheduledTask, "id" | "totalRuns">[] = [
      {
        taskName: "Hourly Feature Refresh",
        cronExpression: "0 * * * *",
        jobType: "FEATURE_REFRESH_HOURLY",
        payload: { featureGroup: "sales_lags_weather" },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 3600000).toISOString(),
        nextRunAt: new Date(Date.now() + 1800000).toISOString(),
        priority: 2,
      },
      {
        taskName: "Nightly Forecast Generation",
        cronExpression: "0 2 * * *",
        jobType: "NIGHTLY_FORECAST_GENERATION",
        payload: { horizonDays: 30 },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000).toISOString(),
        nextRunAt: new Date(Date.now() + 43200000).toISOString(),
        priority: 1,
      },
      {
        taskName: "Daily Recommendation Refresh",
        cronExpression: "0 4 * * *",
        jobType: "RECOMMENDATION_REGENERATE",
        payload: { scope: "inventory_procurement" },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000).toISOString(),
        nextRunAt: new Date(Date.now() + 50400000).toISOString(),
        priority: 3,
      },
      {
        taskName: "Weekly Model Evaluation",
        cronExpression: "0 0 * * 0",
        jobType: "WEEKLY_MODEL_EVALUATION",
        payload: { metric: "MAPE_RMSE" },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        nextRunAt: new Date(Date.now() + 86400000 * 4).toISOString(),
        priority: 2,
      },
      {
        taskName: "Monthly Retraining Orchestration",
        cronExpression: "0 0 1 * *",
        jobType: "MONTHLY_RETRAINING",
        payload: { autoDeploy: true },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        nextRunAt: new Date(Date.now() + 86400000 * 15).toISOString(),
        priority: 1,
      },
      {
        taskName: "Quarterly System Cleanup",
        cronExpression: "0 0 1 */3 *",
        jobType: "QUARTERLY_CLEANUP",
        payload: { purgeLogsOlderThanDays: 90 },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000 * 45).toISOString(),
        nextRunAt: new Date(Date.now() + 86400000 * 45).toISOString(),
        priority: 5,
      },
      // ── Milestone 9 Autonomous Store Jobs ─────────────────────
      {
        taskName: "Daily Morning Brief Generator",
        cronExpression: "0 6 * * *",
        jobType: "MORNING_BRIEF_GENERATION",
        payload: { autoNotify: true, briefType: "morning" },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000).toISOString(),
        nextRunAt: new Date(Date.now() + 21600000).toISOString(),
        priority: 1,
      },
      {
        taskName: "Daily Closing Report Assistant",
        cronExpression: "0 21 * * *",
        jobType: "CLOSING_REPORT_GENERATION",
        payload: { autoReconcile: true, briefType: "closing" },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000).toISOString(),
        nextRunAt: new Date(Date.now() + 75600000).toISOString(),
        priority: 1,
      },
      {
        taskName: "Evening Cash Drawer Reconciliation",
        cronExpression: "30 21 * * *",
        jobType: "CASH_RECONCILIATION_CHECK",
        payload: { detectMismatch: true },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000).toISOString(),
        nextRunAt: new Date(Date.now() + 77400000).toISOString(),
        priority: 2,
      },
      {
        taskName: "Automated Khata Payment Reminders",
        cronExpression: "0 10 * * *",
        jobType: "KHATA_REMINDER_DISPATCH",
        payload: { channels: ["whatsapp", "sms"] },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000).toISOString(),
        nextRunAt: new Date(Date.now() + 36000000).toISOString(),
        priority: 2,
      },
      {
        taskName: "Daily Employee Task Generation",
        cronExpression: "0 7 * * *",
        jobType: "EMPLOYEE_TASK_GENERATION",
        payload: { autoAssign: true },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000).toISOString(),
        nextRunAt: new Date(Date.now() + 25200000).toISOString(),
        priority: 2,
      },
      {
        taskName: "Autonomous Purchase Execution Evaluator",
        cronExpression: "0 * * * *",
        jobType: "AUTONOMOUS_PURCHASE_EXECUTION",
        payload: { checkThresholds: true },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 3600000).toISOString(),
        nextRunAt: new Date(Date.now() + 1800000).toISOString(),
        priority: 1,
      },
      {
        taskName: "Store Health Score Snapshot",
        cronExpression: "59 23 * * *",
        jobType: "STORE_HEALTH_SNAPSHOT",
        payload: { dimensionsCount: 9 },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000).toISOString(),
        nextRunAt: new Date(Date.now() + 86300000).toISOString(),
        priority: 3,
      },
      {
        taskName: "Weekly Supplier Evaluation",
        cronExpression: "0 0 * * 1",
        jobType: "SUPPLIER_EVALUATION",
        payload: { autoRank: true },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        nextRunAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        priority: 3,
      },
      {
        taskName: "Weekly Customer Loyalty Recalculation",
        cronExpression: "0 0 * * 0",
        jobType: "LOYALTY_RECALCULATION",
        payload: { rfmSegmentation: true },
        isEnabled: true,
        lastRunAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        nextRunAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        priority: 3,
      },
    ];

    defaults.forEach((d) => {
      const id = `task_${Math.random().toString(36).substring(2, 8)}`;
      this.tasks.set(id, { ...d, id, totalRuns: 12 });
    });
  }

  public listTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  public toggleTask(id: string, isEnabled: boolean): ScheduledTask | undefined {
    const task = this.tasks.get(id);
    if (task) {
      task.isEnabled = isEnabled;
      return task;
    }
    return undefined;
  }

  public triggerTaskManually(id: string, storeId = "default-store-id") {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    task.lastRunAt = new Date().toISOString();
    task.totalRuns += 1;

    const job = jobQueue.enqueue({
      storeId,
      jobType: task.jobType,
      priority: task.priority,
      payload: { ...task.payload, triggeredBy: "MANUAL_SCHEDULER" },
      maxAttempts: 3,
      scheduledAt: new Date().toISOString(),
    });

    return { task, job };
  }
}

export const enterpriseScheduler = new EnterpriseScheduler();
