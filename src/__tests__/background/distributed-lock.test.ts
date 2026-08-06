import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { distributedLockManager } from "../../lib/background/locks";

describe("DistributedLockManager", () => {
  test("should acquire and release distributed locks with fencing tokens", () => {
    const key = "lock:product:p123";
    const res1 = distributedLockManager.acquire(key, "worker_1");
    assert.equal(res1.acquired, true);
    assert.ok(res1.fenceToken !== undefined);

    const res2 = distributedLockManager.acquire(key, "worker_2");
    assert.equal(res2.acquired, false);

    const released = distributedLockManager.release(key, "worker_1");
    assert.equal(released, true);
  });
});
