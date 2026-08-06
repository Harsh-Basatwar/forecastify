import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { confidenceEngine } from '../../../lib/forecast/explainability/confidence-engine';
import { ConfidenceLevel } from '../../../lib/forecast/explainability/explanation-types';

describe('Confidence Engine Unit Tests', () => {
  test('should breakdown confidence into 7 sub-scores and produce rating level', () => {
    const res = confidenceEngine.calculateConfidenceBreakdown({
      predictionConfidence: 95,
      modelQuality: 92,
      inventoryAccuracy: 98,
    });

    assert.equal(res.overallConfidence >= 80, true);
    assert.equal(res.level, ConfidenceLevel.HIGH);
    assert.equal(res.components.inventoryAccuracy, 98);
  });
});
