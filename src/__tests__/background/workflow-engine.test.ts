import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { workflowEngine } from "../../lib/background/workflows";

describe("WorkflowEngine", () => {
  test("should trigger and list DAG workflow executions", () => {
    const wf = workflowEngine.triggerWorkflow("Test DAG Pipeline");
    assert.ok(wf.id);
    assert.equal(wf.status, "RUNNING");

    const list = workflowEngine.getWorkflows();
    assert.ok(list.length > 0);
  });
});
