import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { idempotencyEngine } from "../../lib/background/idempotency";

describe("IdempotencyEngine", () => {
  test("should claim idempotency keys and prevent duplicate execution", () => {
    const key = "idem_test_key_999";
    const payload = { action: "forecast", storeId: "store-a" };

    const first = idempotencyEngine.checkAndClaim(key, payload);
    assert.equal(first.isDuplicate, false);

    const second = idempotencyEngine.checkAndClaim(key, payload);
    assert.equal(second.isDuplicate, true);
  });
});
