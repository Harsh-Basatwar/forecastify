/**
 * Worker Orchestrator
 * Coordinates worker allocation, job dispatching, and continuous feature/forecast/recommendation/explainability refreshes.
 */

import { workerManager } from "../workers";
import { jobQueue } from "../queue";
import { eventBus } from "../events";

export class WorkerOrchestrator {
  public async orchestrateNextPendingJob() {
    const queuedJobs = jobQueue.listJobs({ status: "QUEUED" });
    if (queuedJobs.length === 0) return null;

    const nextJob = queuedJobs[0];
    const workers = workerManager.getWorkers();
    const availableWorker = workers.find((w) => w.status === "IDLE");

    if (!availableWorker) {
      return { status: "WAITING_FOR_WORKER", jobId: nextJob.id };
    }

    jobQueue.updateJobStatus(nextJob.id, "RUNNING");
    const workerInstance = workerManager.getWorker(availableWorker.id);

    if (!workerInstance) return null;

    try {
      eventBus.publish("worker.started", { workerId: availableWorker.id, jobId: nextJob.id });
      const result = await workerInstance.executeJob(nextJob.id, nextJob.payload);
      jobQueue.updateJobStatus(nextJob.id, "SUCCEEDED", { result });
      eventBus.publish("job.completed", { jobId: nextJob.id, result });
      return { status: "EXECUTED", jobId: nextJob.id, workerId: availableWorker.id, result };
    } catch (err: any) {
      jobQueue.updateJobStatus(nextJob.id, "FAILED", { errorMessage: err.message || "Worker execution failed" });
      eventBus.publish("job.failed", { jobId: nextJob.id, error: err.message });
      return { status: "FAILED", jobId: nextJob.id, error: err.message };
    }
  }
}

export const workerOrchestrator = new WorkerOrchestrator();
