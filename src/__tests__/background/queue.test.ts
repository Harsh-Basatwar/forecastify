import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { jobQueue } from "../../lib/background/queue";

describe("JobQueue System", () => {
  test("should enqueue a new job and enforce idempotency", () => {
    const job1 = jobQueue.enqueue({
      storeId: "test-store",
      jobType: "TEST_JOB",
      priority: 1,
      payload: { value: 42 },
      maxAttempts: 3,
      scheduledAt: new Date().toISOString(),
      idempotencyKey: "idem_key_123",
    });

    assert.ok(job1.id);

    const job2 = jobQueue.enqueue({
      storeId: "test-store",
      jobType: "TEST_JOB",
      priority: 1,
      payload: { value: 42 },
      maxAttempts: 3,
      scheduledAt: new Date().toISOString(),
      idempotencyKey: "idem_key_123",
    });

    assert.equal(job2.id, job1.id);
  });

  test("should update job status along lifecycle", () => {
    const job = jobQueue.enqueue({
      storeId: "test-store",
      jobType: "LIFECYCLE_TEST",
      priority: 2,
      payload: {},
      maxAttempts: 3,
      scheduledAt: new Date().toISOString(),
    });

    const running = jobQueue.updateJobStatus(job.id, "RUNNING");
    assert.equal(running?.status, "RUNNING");

    const done = jobQueue.updateJobStatus(job.id, "SUCCEEDED", { result: { ok: true } });
    assert.equal(done?.status, "SUCCEEDED");
  });

  test("should report queue metrics", () => {
    const metrics = jobQueue.getQueueMetrics();
    assert.ok(metrics.totalJobs > 0);
  });
});
