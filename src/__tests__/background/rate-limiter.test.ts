import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { rateLimiter } from "../../lib/background/ratelimit";

describe("RateLimiter", () => {
  test("should enforce sliding window rate limits", () => {
    const key = "client_store_test";
    const res1 = rateLimiter.checkRateLimit(key, 2);
    assert.equal(res1.allowed, true);

    const res2 = rateLimiter.checkRateLimit(key, 2);
    assert.equal(res2.allowed, true);

    const res3 = rateLimiter.checkRateLimit(key, 2);
    assert.equal(res3.allowed, false);
  });
});
