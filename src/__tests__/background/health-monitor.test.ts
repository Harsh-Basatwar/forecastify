import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { healthMonitor } from "../../lib/background/health";

describe("HealthMonitor", () => {
  test("should monitor 14 subsystems", () => {
    const subsystems = healthMonitor.getSubsystems();
    assert.equal(subsystems.length, 14);
  });

  test("should calculate overall status", () => {
    const status = healthMonitor.getOverallStatus();
    assert.equal(status, "HEALTHY");
  });
});
