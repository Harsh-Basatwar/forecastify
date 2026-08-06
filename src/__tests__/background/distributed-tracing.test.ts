import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { distributedTracing } from "../../lib/background/tracing";

describe("DistributedTracing", () => {
  test("should record and query trace spans", () => {
    const span = distributedTracing.recordSpan({
      traceId: "tr_test_123",
      spanId: "sp_child",
      parentSpanId: "sp_parent",
      subsystem: "UnitTest",
      operation: "run_test_op",
      durationMs: 15,
      status: "OK",
      metadata: {},
    });

    assert.ok(span.id);
    const fetched = distributedTracing.getSpans("tr_test_123");
    assert.equal(fetched.length, 1);
  });
});
