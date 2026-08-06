import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { recommendationComparisonEngine } from '../../../lib/forecast/explainability/recommendation-comparison';

describe('Recommendation Comparison Engine Unit Tests', () => {
  test('should compare primary decision against alternatives with multi-objective criteria', () => {
    const comparison = recommendationComparisonEngine.compareRecommendations('rec_1', 'Order Stock', []);

    assert.equal(comparison.primaryRecommendationId, 'rec_1');
    assert.equal(comparison.selectionCriteria.winningMarginPercentage > 0, true);
    assert.equal(comparison.comparisonSummary.includes('winning Margin'), false);
    assert.equal(comparison.comparisonSummary.length > 20, true);
  });
});
