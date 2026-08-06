import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { cacheManager } from "../../lib/background/cache";

describe("CacheManager", () => {
  test("should track cache metrics and support warming/invalidation", () => {
    const metrics = cacheManager.getCacheMetrics();
    assert.ok(metrics.length > 0);

    const warmed = cacheManager.warmCache("ForecastCache");
    assert.ok(warmed.itemCount > 0);

    const invalidated = cacheManager.invalidateNamespace("ForecastCache");
    assert.equal(invalidated, true);
  });
});
