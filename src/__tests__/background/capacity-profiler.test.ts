import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { capacityPlanner } from "../../lib/background/capacity";
import { performanceProfiler } from "../../lib/background/profiler";

describe("Capacity Planner & Profiler", () => {
  test("should calculate projections and profile slow queries", () => {
    const proj = capacityPlanner.getCapacityProjections();
    assert.ok(proj.length > 0);

    const slow = performanceProfiler.getSlowQueries();
    assert.ok(slow.length > 0);
  });
});
