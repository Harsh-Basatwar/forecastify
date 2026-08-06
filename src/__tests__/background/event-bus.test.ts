import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { eventBus } from "../../lib/background/events";

describe("EnterpriseEventBus", () => {
  test("should publish and subscribe to typed system events", async () => {
    let received = false;
    const unsub = eventBus.subscribe("job.completed", () => {
      received = true;
    });

    await eventBus.publish("job.completed", { jobId: "test_job_1" });
    assert.equal(received, true);

    unsub();
  });
});
