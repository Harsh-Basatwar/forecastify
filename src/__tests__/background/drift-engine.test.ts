import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { driftEngine } from "../../lib/background/drift";

describe("DriftEngine", () => {
  test("should return drift reports", () => {
    const reports = driftEngine.getLatestReports();
    assert.ok(reports.length > 0);
  });

  test("should run analysis and return new report", () => {
    const report = driftEngine.runDriftAnalysis("model-test-v1");
    assert.ok(report.psiScore >= 0);
    assert.ok(report.klDivergence >= 0);
  });
});
