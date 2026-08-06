import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { jobQueue } from "../../lib/background/queue";
import { workerOrchestrator } from "../../lib/background/orchestration";
import { eventBus } from "../../lib/background/events";
import { healthMonitor } from "../../lib/background/health";
import { driftEngine } from "../../lib/background/drift";
import { workflowEngine } from "../../lib/background/workflows";

describe("Milestone 7 Autonomous Operations Integration", () => {
  test("should run full autonomous workflow simulation", async () => {
    // 1. Trigger Workflow
    const wf = workflowEngine.triggerWorkflow("Integration End-to-End Test");
    assert.equal(wf.status, "RUNNING");

    // 2. Enqueue Job
    const job = jobQueue.enqueue({
      storeId: "store-integration-test",
      jobType: "FEATURE_REFRESH_HOURLY",
      priority: 1,
      payload: { featureGroup: "all" },
      maxAttempts: 3,
      scheduledAt: new Date().toISOString(),
    });
    assert.equal(job.status, "QUEUED");

    // 3. Worker Execution
    const orchestrateRes = await workerOrchestrator.orchestrateNextPendingJob();
    assert.ok(orchestrateRes !== null);

    // 4. Publish Event
    const evt = await eventBus.publish("features.refreshed", { storeId: "store-integration-test" });
    assert.ok(evt.id);

    // 5. Health Check
    const health = healthMonitor.getOverallStatus();
    assert.equal(health, "HEALTHY");

    // 6. Drift Check
    const drift = driftEngine.getLatestReports();
    assert.ok(drift.length > 0);
  });
});
