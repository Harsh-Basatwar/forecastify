import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { alertEngine } from "../../lib/background/alerts";

describe("AlertEngine", () => {
  test("should create and resolve alerts", () => {
    const alert = alertEngine.createAlert({
      title: "Test Alert",
      message: "Unit test message",
      severity: "WARNING",
      subsystem: "UnitTest",
    });

    assert.equal(alert.isResolved, false);

    const resolved = alertEngine.resolveAlert(alert.id, "TestRunner");
    assert.equal(resolved?.isResolved, true);
  });
});
