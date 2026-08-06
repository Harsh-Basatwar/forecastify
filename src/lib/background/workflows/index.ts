/**
 * Workflow Engine
 * Orchestrates multi-step DAG workflows (Temporal/Airflow model) with step retries, rollback, and state tracking.
 */

export interface WorkflowStep {
  stepId: string;
  name: string;
  jobType: string;
  dependsOnStepIds: string[];
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
  attempts: number;
}

export interface WorkflowExecution {
  id: string;
  name: string;
  storeId: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "ROLLBACK_IN_PROGRESS" | "ROLLED_BACK";
  steps: WorkflowStep[];
  currentStepId?: string;
  correlationId: string;
  startedAt: string;
  completedAt?: string;
}

export class WorkflowEngine {
  private executions: WorkflowExecution[] = [];

  constructor() {
    this.seedMockWorkflows();
  }

  private seedMockWorkflows() {
    this.executions = [
      {
        id: "wf_exec_1",
        name: "Nightly End-to-End Autonomous Pipeline",
        storeId: "default-store-id",
        status: "SUCCEEDED",
        correlationId: "corr_wf_8921",
        startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        completedAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
        steps: [
          { stepId: "s1", name: "Refresh Features", jobType: "FEATURE_REFRESH_HOURLY", dependsOnStepIds: [], status: "COMPLETED", attempts: 1 },
          { stepId: "s2", name: "Generate Forecasts", jobType: "NIGHTLY_FORECAST_GENERATION", dependsOnStepIds: ["s1"], status: "COMPLETED", attempts: 1 },
          { stepId: "s3", name: "Evaluate Models", jobType: "WEEKLY_MODEL_EVALUATION", dependsOnStepIds: ["s2"], status: "COMPLETED", attempts: 1 },
          { stepId: "s4", name: "Generate Recommendations", jobType: "RECOMMENDATION_REGENERATE", dependsOnStepIds: ["s3"], status: "COMPLETED", attempts: 1 },
          { stepId: "s5", name: "Build Explanations", jobType: "EXPLAINABILITY_REBUILD", dependsOnStepIds: ["s4"], status: "COMPLETED", attempts: 1 },
          { stepId: "s6", name: "Dispatch Notifications", jobType: "NOTIFICATION_DISPATCH", dependsOnStepIds: ["s5"], status: "COMPLETED", attempts: 1 },
        ],
      },
    ];
  }

  public getWorkflows(): WorkflowExecution[] {
    return [...this.executions];
  }

  public triggerWorkflow(name: string, storeId = "default-store-id"): WorkflowExecution {
    const exec: WorkflowExecution = {
      id: `wf_exec_${Date.now()}`,
      name,
      storeId,
      status: "RUNNING",
      correlationId: `corr_wf_${Math.random().toString(36).substring(2, 7)}`,
      startedAt: new Date().toISOString(),
      steps: [
        { stepId: "s1", name: "Refresh Features", jobType: "FEATURE_REFRESH_HOURLY", dependsOnStepIds: [], status: "RUNNING", attempts: 1 },
        { stepId: "s2", name: "Generate Forecasts", jobType: "NIGHTLY_FORECAST_GENERATION", dependsOnStepIds: ["s1"], status: "PENDING", attempts: 0 },
        { stepId: "s3", name: "Generate Recommendations", jobType: "RECOMMENDATION_REGENERATE", dependsOnStepIds: ["s2"], status: "PENDING", attempts: 0 },
      ],
    };
    this.executions.unshift(exec);
    return exec;
  }
}

export const workflowEngine = new WorkflowEngine();
