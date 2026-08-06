import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { enterpriseScheduler } from "../../lib/background/scheduler";

describe("EnterpriseScheduler", () => {
  test("should list default scheduled tasks", () => {
    const tasks = enterpriseScheduler.listTasks();
    assert.ok(tasks.length > 0);
  });

  test("should toggle task status", () => {
    const tasks = enterpriseScheduler.listTasks();
    const task = tasks[0];
    const updated = enterpriseScheduler.toggleTask(task.id, false);
    assert.equal(updated?.isEnabled, false);
    enterpriseScheduler.toggleTask(task.id, true);
  });

  test("should manually trigger task execution", () => {
    const tasks = enterpriseScheduler.listTasks();
    const result = enterpriseScheduler.triggerTaskManually(tasks[0].id);
    assert.ok(result !== undefined);
    assert.equal(result?.job.status, "QUEUED");
  });
});
