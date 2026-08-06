import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { slaMonitor } from "../../lib/background/sla";

describe("SLAMonitor", () => {
  test("should return SLA compliance metrics", () => {
    const metrics = slaMonitor.getSLAMetrics();
    assert.ok(metrics.length > 0);
    assert.ok(metrics[0].compliancePct > 0);
  });
});
