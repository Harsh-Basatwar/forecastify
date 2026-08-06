import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { recoveryEngine } from "../../lib/background/recovery";

describe("RecoveryEngine", () => {
  test("should calculate exponential backoff delay with jitter", () => {
    const delay1 = recoveryEngine.calculateExponentialBackoff(1);
    const delay2 = recoveryEngine.calculateExponentialBackoff(2);
    assert.ok(delay1 >= 1000);
    assert.ok(delay2 > delay1);
  });

  test("should handle circuit breaker state transitions", () => {
    const cb = recoveryEngine.getCircuitBreaker("DatabaseTest");
    assert.equal(cb.state, "CLOSED");

    for (let i = 0; i < 5; i++) {
      recoveryEngine.recordFailure("DatabaseTest");
    }

    const updated = recoveryEngine.getCircuitBreaker("DatabaseTest");
    assert.equal(updated.state, "OPEN");

    recoveryEngine.recordSuccess("DatabaseTest");
    const reset = recoveryEngine.getCircuitBreaker("DatabaseTest");
    assert.equal(reset.state, "CLOSED");
  });
});
