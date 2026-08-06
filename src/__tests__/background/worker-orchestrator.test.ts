import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { workerManager } from "../../lib/background/workers";
import { workerOrchestrator } from "../../lib/background/orchestration";

describe("WorkerOrchestrator", () => {
  test("should list 12 active workers", () => {
    const workers = workerManager.getWorkers();
    assert.equal(workers.length, 12);
  });

  test("should attempt orchestration on pending job queue", async () => {
    const res = await workerOrchestrator.orchestrateNextPendingJob();
    assert.ok(res !== undefined);
  });
});
