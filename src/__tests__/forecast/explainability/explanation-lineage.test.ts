import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { explanationLineageTracker } from '../../../lib/forecast/explainability/explanation-lineage';

describe('Explanation Lineage Unit Tests', () => {
  test('should generate cryptographic SHA256 lineage hash and verify provenance', () => {
    const lineage = explanationLineageTracker.createLineage({
      explanationId: 'exp_lin_1',
      predictionId: 'pred_lin_1',
      recommendationId: 'rec_lin_1',
    });

    assert.equal(lineage.lineageHash.length, 64);
    assert.equal(explanationLineageTracker.verifyLineage(lineage), true);
  });
});
