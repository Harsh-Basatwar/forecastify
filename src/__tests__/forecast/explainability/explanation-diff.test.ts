import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { explanationDiffEngine } from '../../../lib/forecast/explainability/explanation-diff';

describe('Explanation Diff Engine Unit Tests', () => {
  test('should compute confidence and attribution diffs between explanation versions', () => {
    const v1: any = {
      explanationId: 'exp_diff_1',
      metadata: { version: 1, generatedAt: new Date().toISOString(), audience: 'ANALYST', attributionStrategy: 'COEFFICIENT' },
      confidenceBreakdown: { overallConfidence: 80 },
      explainabilityScore: { totalScore: 85 },
    };
    const v2: any = {
      explanationId: 'exp_diff_1',
      metadata: { version: 2, generatedAt: new Date().toISOString(), audience: 'ANALYST', attributionStrategy: 'COEFFICIENT' },
      confidenceBreakdown: { overallConfidence: 90 },
      explainabilityScore: { totalScore: 92 },
    };

    const diff = explanationDiffEngine.computeDiff(v1, v2);

    assert.equal(diff.confidenceDelta, 10);
    assert.equal(diff.scoreDelta, 7);
    assert.equal(diff.versionFrom, 1);
    assert.equal(diff.versionTo, 2);
  });
});
